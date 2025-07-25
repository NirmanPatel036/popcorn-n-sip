# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy everything into the container
COPY . .

# Install dependencies
RUN pip install --upgrade pip
RUN pip install -r api/requirements.txt

# Expose the port used by the FastAPI app
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000"]
