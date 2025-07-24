#!/bin/bash

# Build and run the Docker container locally
docker build -t netflix-recommender-api .
docker run -p 8000:8000 netflix-recommender-api
