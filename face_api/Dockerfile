# Gunakan Python 3.10 slim yang direkomendasikan untuk DeepFace/OpenCV
FROM python:3.10-slim

WORKDIR /app

# Instal pustaka sistem yang dibutuhkan oleh OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Salin daftar pustaka Python
COPY requirements.txt .

# Instal dependensi Python
RUN pip install --no-cache-dir -r requirements.txt

# Salin kode sumber
COPY . .
RUN chmod +x /app/docker-entrypoint.sh /app/uvicorn-azure-wrap.sh \
    && mv /usr/local/bin/uvicorn /usr/local/bin/uvicorn.installed \
    && cp /app/uvicorn-azure-wrap.sh /usr/local/bin/uvicorn \
    && chmod +x /usr/local/bin/uvicorn

# Folder wajah, temp upload, dan cache bobot DeepFace (DEEPFACE_HOME)
RUN mkdir -p /app/storage/faces /app/tmp /app/weights

# Buka akses port 5000
EXPOSE 5000

# ENTRYPOINT: Azure sering menyuntik `uvicorn ../main:app`; entrypoint mengabaikan itu dan memakai main:app dari /app
ENTRYPOINT ["/app/docker-entrypoint.sh"]
