import pandas as pd
import numpy as np
import tensorflow as tf
from keras import layers, Model

df = pd.read_csv("/Users/nirmanpatel36/Documents/Mahindra University/Semester_04/Machine Learning/NRS/netflix_content_2023.csv")
print(df.head())

df['Hours Viewed'] = df['Hours Viewed'].str.replace(',', '', regex=False).astype('int64')

# drop rows with missing titles or duplicate titles
df.dropna(subset=['Title'], inplace=True)
df.drop_duplicates(subset=['Title'], inplace=True)

# create simple content IDs for TensorFlow embeddings
df['Content_ID'] = df.reset_index().index.astype('int32')

# encode 'Language Indicator' and 'Content Type'
df['Language_ID'] = df['Language Indicator'].astype('category').cat.codes
df['ContentType_ID'] = df['Content Type'].astype('category').cat.codes

print(df[['Content_ID', 'Title', 'Hours Viewed', 'Language_ID', 'ContentType_ID']].head())

num_contents = df['Content_ID'].nunique()
num_languages = df['Language_ID'].nunique()
num_types = df['ContentType_ID'].nunique()

content_input = layers.Input(shape=(1,), dtype=tf.int32, name='content_id')
language_input = layers.Input(shape=(1,), dtype=tf.int32, name='language_id')
type_input = layers.Input(shape=(1,), dtype=tf.int32, name='content_type')

content_embedding = layers.Embedding(input_dim=num_contents+1, output_dim=32)(content_input)
language_embedding = layers.Embedding(input_dim=num_languages+1, output_dim=8)(language_input)
type_embedding = layers.Embedding(input_dim=num_types+1, output_dim=4)(type_input)

content_vec = layers.Flatten()(content_embedding)
language_vec = layers.Flatten()(language_embedding)
type_vec = layers.Flatten()(type_embedding)

combined = layers.Concatenate()([content_vec, language_vec, type_vec])
x = layers.Dense(64, activation='relu')(combined)
x = layers.Dense(32, activation='relu')(x)
output = layers.Dense(num_contents, activation='softmax')(x)

model = Model(inputs=[content_input, language_input, type_input], outputs=output)
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

model.fit(
    x={
        'content_id': df['Content_ID'],
        'language_id': df['Language_ID'],
        'content_type': df['ContentType_ID']
    },
    y=df['Content_ID'],
    epochs=5,
    batch_size=64
)

def recommend_similar(content_title, top_k=5):
    content_row = df[df['Title'].str.contains(content_title, case=False, na=False)].iloc[0]
    content_id = content_row['Content_ID']
    language_id = content_row['Language_ID']
    content_type_id = content_row['ContentType_ID']

    predictions = model.predict({
        'content_id': np.array([content_id]),
        'language_id': np.array([language_id]),
        'content_type': np.array([content_type_id])
    })

    top_indices = predictions[0].argsort()[-top_k-1:][::-1]
    recommendations = df[df['Content_ID'].isin(top_indices)]
    return recommendations[['Title', 'Language Indicator', 'Content Type', 'Hours Viewed']]

print(recommend_similar("Wednesday"))