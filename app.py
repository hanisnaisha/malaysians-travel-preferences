import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import itertools
import os
from flask import Flask

app = Flask(__name__)

# Load your data
df = pd.read_csv('static/travelling-companion-cleaned.csv')

# Top 5 countries
top5 = df['Country'].value_counts().nlargest(5).index.tolist()
df['Country_grouped'] = df['Country'].apply(lambda x: x if x in top5 else 'Other')

# Encode features
le_companion = LabelEncoder()
le_continent = LabelEncoder()
le_country_grouped = LabelEncoder()

df['Companion_enc'] = le_companion.fit_transform(df['Travelling Companion'])
df['Continent_enc'] = le_continent.fit_transform(df['Continent'])
df['Country_grouped_enc'] = le_country_grouped.fit_transform(df['Country_grouped'])

X = df[['Companion_enc', 'Year', 'Continent_enc']]
y = df['Country_grouped_enc']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Decision Tree
dt_model = DecisionTreeClassifier(random_state=42)
dt_model.fit(X_train, y_train)

# Random Forest
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

# Neural Network (MLP)
nn_model = MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=1000, random_state=42)
nn_model.fit(X_train, y_train)

models = [dt_model, rf_model, nn_model]
model_names = ['Decision Tree', 'Random Forest', 'Neural Network']

for model, name in zip(models, model_names):
    y_pred = model.predict(X_test)
    print(f'=== {name} ===')
    print('Accuracy:', accuracy_score(y_test, y_pred))
    print('Precision:', precision_score(y_test, y_pred, average='weighted', zero_division=0))
    print('Recall:', recall_score(y_test, y_pred, average='weighted', zero_division=0))
    print('F1 Score:', f1_score(y_test, y_pred, average='weighted', zero_division=0))
    print('Confusion Matrix:\n', confusion_matrix(y_test, y_pred))
    print('Classification Report:\n', classification_report(y_test, y_pred, target_names=le_country_grouped.classes_))
    print('-' * 60)

accuracies = []
precisions = []
recalls = []
f1s = []

for model in models:
    y_pred = model.predict(X_test)
    accuracies.append(accuracy_score(y_test, y_pred))
    precisions.append(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    recalls.append(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    f1s.append(f1_score(y_test, y_pred, average='weighted', zero_division=0))

print('Accuracies:', accuracies)
print('Precisions:', precisions)
print('Recalls:', recalls)
print('F1s:', f1s)

metrics = np.array([accuracies, precisions, recalls, f1s])
labels = ['Accuracy', 'Precision', 'Recall', 'F1 Score']

plt.figure(figsize=(10,6))
for i, metric in enumerate(metrics):
    plt.plot(model_names, metric, marker='o', label=labels[i])
plt.title('Model Performance Comparison')
plt.ylabel('Score')
plt.ylim(0, 1)
plt.legend()
plt.grid(True)
plt.show()

# Example: Predict for a solo traveler in Asia, 2017
companion = le_companion.transform(['ALONE'])[0]
continent = le_continent.transform(['Asia'])[0]
year = 2017

X_new = [[companion, year, continent]]
pred_country_enc = rf_model.predict(X_new)[0]
pred_country = le_country_grouped.inverse_transform([pred_country_enc])[0]
print('Predicted destination for solo traveler in Asia, 2017:', pred_country)

# Predict on test set
y_pred = rf_model.predict(X_test)

# Get class names (e.g., continents or grouped countries)
class_names = le_country_grouped.classes_  # or le_continent.classes_ if you grouped by continent

# Compute confusion matrix
cm = confusion_matrix(y_test, y_pred)

# Plot
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names)
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix - Random Forest')
plt.tight_layout()
plt.show()

# Add decoded columns
df_test = X_test.copy()
df_test['Companion'] = le_companion.inverse_transform(df_test['Companion_enc'])
df_test['Continent'] = le_continent.inverse_transform(df_test['Continent_enc'])
df_test['Actual'] = le_country_grouped.inverse_transform(y_test)
df_test['Predicted'] = le_country_grouped.inverse_transform(y_pred)

# Only keep the readable columns for export
export_cols = ['Companion', 'Year', 'Continent', 'Actual', 'Predicted']
df_test[export_cols].to_json('dashboard_predictions.json', orient='records')

print(le_companion.classes_)
print(le_continent.classes_)

# Predict for a solo traveler in Asia in 2026
companion = le_companion.transform(['ALONE'])[0]
continent = le_continent.transform(['Asia'])[0]
year = 2026

X_future = [[companion, year, continent]]
pred_country_enc = rf_model.predict(X_future)[0]
pred_country = le_country_grouped.inverse_transform([pred_country_enc])[0]
print('Predicted destination for solo traveler in Asia, 2026:', pred_country)

# Get all unique companions and continents from your encoders
companions = le_companion.classes_
continents = le_continent.classes_
years = [2026, 2027]

# Generate all combinations
combos = list(itertools.product(companions, continents, years))

# Prepare input for prediction
rows = []
for companion, continent, year in combos:
    companion_enc = le_companion.transform([companion])[0]
    continent_enc = le_continent.transform([continent])[0]
    X_pred = [[companion_enc, year, continent_enc]]
    pred_country_enc = rf_model.predict(X_pred)[0]
    pred_country = le_country_grouped.inverse_transform([pred_country_enc])[0]
    rows.append({
        'Companion': companion,
        'Year': year,
        'Continent': continent,
        'Predicted': pred_country
    })

# Export to JSON
pred_df = pd.DataFrame(rows)
pred_df.to_json('dashboard_future_predictions.json', orient='records', indent=2)
print(pred_df.head())

# --- 1. Export actual vs. predicted for 2016–2017 ---

# Predict on test set (or all 2016/2017 data)
df_2016_2017 = df[df['Year'].isin([2016, 2017])].copy()
df_2016_2017['Companion_enc'] = le_companion.transform(df_2016_2017['Travelling Companion'])
df_2016_2017['Continent_enc'] = le_continent.transform(df_2016_2017['Continent'])
X_hist = df_2016_2017[['Companion_enc', 'Year', 'Continent_enc']]

# Fit the encoder with all unique countries in your dataset
le_country_grouped.fit(df_2016_2017['Country'].unique())
# Now transform
y_hist = le_country_grouped.transform(df_2016_2017['Country'])

y_pred_hist = rf_model.predict(X_hist)

df_2016_2017['Companion'] = df_2016_2017['Travelling Companion']
df_2016_2017['Continent'] = df_2016_2017['Continent']
df_2016_2017['Actual'] = df_2016_2017['Country']
df_2016_2017['Predicted'] = le_country_grouped.inverse_transform(y_pred_hist)

export_cols_hist = ['Companion', 'Year', 'Continent', 'Actual', 'Predicted']
df_2016_2017[export_cols_hist].to_json('dashboard_predictions_2016_2017.json', orient='records', indent=2)

# --- 2. Export predictions for 2026–2027 (no actual column) ---

companions = le_companion.classes_
continents = le_continent.classes_
years = [2026, 2027]

combos = list(itertools.product(companions, continents, years))
rows = []
for companion, continent, year in combos:
    companion_enc = le_companion.transform([companion])[0]
    continent_enc = le_continent.transform([continent])[0]
    X_pred = [[companion_enc, year, continent_enc]]
    pred_country_enc = rf_model.predict(X_pred)[0]
    pred_country = le_country_grouped.inverse_transform([pred_country_enc])[0]
    rows.append({
        'Companion': companion,
        'Year': year,
        'Continent': continent,
        'Predicted': pred_country
    })

pred_df = pd.DataFrame(rows)
pred_df.to_json('dashboard_predictions_2026_2027.json', orient='records', indent=2)

print("Exported dashboard_predictions_2016_2017.json and dashboard_predictions_2026_2027.json")

if __name__ == '__main__':
    # Local development
    app.run(debug=True, host='127.0.0.1', port=5000)
else:
    # Production (when imported by Gunicorn)
    app.config['ENV'] = 'production'
    app.config['DEBUG'] = False
