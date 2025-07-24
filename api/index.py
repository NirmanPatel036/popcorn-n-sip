from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import tensorflow as tf
from keras import layers, Model
import io
import pickle
import os
from typing import List, Optional

app = FastAPI(title="Movie Content Recommender API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store model and data
model = None
df = None
content_mappings = {}

class RecommendationRequest(BaseModel):
    content_title: str
    top_k: int = 5

class RecommendationResponse(BaseModel):
    title: str
    language: str
    content_type: str
    hours_viewed: int

def preprocess_data(dataframe):
    """Preprocess the movie data"""
    # Clean hours viewed column
    dataframe['Hours Viewed'] = dataframe['Hours Viewed'].str.replace(',', '', regex=False).astype('int64')
    
    # Drop rows with missing titles or duplicate titles
    dataframe.dropna(subset=['Title'], inplace=True)
    dataframe.drop_duplicates(subset=['Title'], inplace=True)
    
    # Create simple content IDs for TensorFlow embeddings
    dataframe['Content_ID'] = dataframe.reset_index().index.astype('int32')
    
    # Encode 'Language Indicator' and 'Content Type'
    dataframe['Language_ID'] = dataframe['Language Indicator'].astype('category').cat.codes
    dataframe['ContentType_ID'] = dataframe['Content Type'].astype('category').cat.codes
    
    return dataframe

def build_and_train_model(dataframe):
    """Build and train the recommendation model"""
    num_contents = dataframe['Content_ID'].nunique()
    num_languages = dataframe['Language_ID'].nunique()
    num_types = dataframe['ContentType_ID'].nunique()
    
    # Input layers
    content_input = layers.Input(shape=(1,), dtype=tf.int32, name='content_id')
    language_input = layers.Input(shape=(1,), dtype=tf.int32, name='language_id')
    type_input = layers.Input(shape=(1,), dtype=tf.int32, name='content_type')
    
    # Embedding layers
    content_embedding = layers.Embedding(input_dim=num_contents+1, output_dim=32)(content_input)
    language_embedding = layers.Embedding(input_dim=num_languages+1, output_dim=8)(language_input)
    type_embedding = layers.Embedding(input_dim=num_types+1, output_dim=4)(type_input)
    
    # Flatten embeddings
    content_vec = layers.Flatten()(content_embedding)
    language_vec = layers.Flatten()(language_embedding)
    type_vec = layers.Flatten()(type_embedding)
    
    # Combine and process
    combined = layers.Concatenate()([content_vec, language_vec, type_vec])
    x = layers.Dense(64, activation='relu')(combined)
    x = layers.Dense(32, activation='relu')(x)
    output = layers.Dense(num_contents, activation='softmax')(x)
    
    # Create and compile model
    model = Model(inputs=[content_input, language_input, type_input], outputs=output)
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    
    # Train model
    model.fit(
        x={
            'content_id': dataframe['Content_ID'],
            'language_id': dataframe['Language_ID'],
            'content_type': dataframe['ContentType_ID']
        },
        y=dataframe['Content_ID'],
        epochs=5,
        batch_size=64,
        verbose=0
    )
    
    return model

@app.on_event("startup")
async def startup_event():
    """Initialize model with sample data on startup"""
    global model, df, content_mappings
    
    # Create sample Netflix data for demonstration
    sample_data = {
        'Title': [
            'Wednesday', 'Stranger Things', 'The Crown', 'Bridgerton', 'Money Heist',
            'Squid Game', 'Ozark', 'The Witcher', 'Narcos', 'Dark',
            'Elite', 'Casa de Papel', 'You', 'Lucifer', 'The Umbrella Academy',
            'Orange Is the New Black', 'House of Cards', 'Black Mirror',
            'Mindhunter', 'The Queen\'s Gambit'
        ],
        'Language Indicator': [
            'English', 'English', 'English', 'English', 'Spanish',
            'Korean', 'English', 'English', 'Spanish', 'German',
            'Spanish', 'Spanish', 'English', 'English', 'English',
            'English', 'English', 'English', 'English', 'English'
        ],
        'Content Type': [
            'TV Show', 'TV Show', 'TV Show', 'TV Show', 'TV Show',
            'TV Show', 'TV Show', 'TV Show', 'TV Show', 'TV Show',
            'TV Show', 'TV Show', 'TV Show', 'TV Show', 'TV Show',
            'TV Show', 'TV Show', 'TV Show', 'TV Show', 'TV Show'
        ],
        'Hours Viewed': [
            '245,000,000', '582,100,000', '107,390,000', '625,490,000', '444,000,000',
            '1,650,450,000', '491,070,000', '541,020,000', '113,380,000', '188,170,000',
            '270,000,000', '444,000,000', '540,730,000', '569,500,000', '394,020,000',
            '105,980,000', '364,020,000', '103,440,000', '97,980,000', '625,490,000'
        ]
    }
    
    df = pd.DataFrame(sample_data)
    df = preprocess_data(df)
    model = build_and_train_model(df)
    
    print("Model initialized with sample data")

@app.post("/upload-data")
async def upload_data(file: UploadFile = File(...)):
    """Upload and process Netflix CSV data"""
    global model, df, content_mappings
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        df = preprocess_data(df)
        model = build_and_train_model(df)
        
        return {"message": "Data uploaded and model trained successfully", "total_content": len(df)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@app.get("/content")
async def get_all_content():
    """Get all available content titles"""
    if df is None:
        raise HTTPException(status_code=400, detail="No data loaded")
    
    return {"content": df['Title'].tolist()}

@app.post("/recommend", response_model=List[RecommendationResponse])
async def get_recommendations(request: RecommendationRequest):
    """Get content recommendations based on input title"""
    if model is None or df is None:
        raise HTTPException(status_code=400, detail="Model not initialized")
    
    try:
        # Find content by title (case-insensitive partial match)
        matching_content = df[df['Title'].str.contains(request.content_title, case=False, na=False)]
        
        if matching_content.empty:
            raise HTTPException(status_code=404, detail=f"Content '{request.content_title}' not found")
        
        content_row = matching_content.iloc[0]
        content_id = content_row['Content_ID']
        language_id = content_row['Language_ID']
        content_type_id = content_row['ContentType_ID']
        
        # Get predictions
        predictions = model.predict({
            'content_id': np.array([content_id]),
            'language_id': np.array([language_id]),
            'content_type': np.array([content_type_id])
        }, verbose=0)
        
        # Get top recommendations
        top_indices = predictions[0].argsort()[-request.top_k-1:][::-1]
        recommendations = df[df['Content_ID'].isin(top_indices)]
        
        # Filter out the input content itself
        recommendations = recommendations[recommendations['Title'] != content_row['Title']]
        
        # Format response
        result = []
        for _, row in recommendations.head(request.top_k).iterrows():
            result.append(RecommendationResponse(
                title=row['Title'],
                language=row['Language Indicator'],
                content_type=row['Content Type'],
                hours_viewed=row['Hours Viewed']
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Netflix Content Recommender API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
