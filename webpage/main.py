from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
import joblib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "http://127.0.0.1:5502",
        "https://jyepez26.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

kmeans = joblib.load("kmeans_model.pkl")

# Request schema
class InputValues(BaseModel):
    temp: float
    hr: float
    eda: float

@app.post("/predict")
def predict_grade(data: InputValues):
    # Fill in default values
    feature_vector = [
        data.temp,           # temp_mean
        4.458838,            # temp_std
        14.980000,           # temp_min
        33.466000,           # temp_max
        data.hr,             # hr_mean
        25.595749,           # hr_std
        54.052000,           # hr_min
        200.247000,          # hr_max
        data.eda,            # eda_mean
        0.362172,            # eda_std
        0,                   # eda_min
        4.283180             # eda_max
    ]

    df = pd.DataFrame([feature_vector])
    cluster = int(kmeans.predict(df)[0])

    # Choose grade based on cluster
    if cluster == 0:
        cluster = "Low Stress Student"
        grade = float(np.random.choice(np.arange(0.6, 0.8, 0.01)))
    elif cluster == 1:
        cluster = "Medium Stress Student"
        grade = float(np.random.choice(np.arange(0.75, 0.95, 0.01)))
    else:
        cluster = "High Stress Student"
        grade = float(np.random.choice(np.arange(0.5, 0.75, 0.01)))

    return {"grade": round(grade, 2), "cluster": cluster}
