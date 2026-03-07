FROM mcr.microsoft.com/playwright:v1.45.0-noble

WORKDIR /app

# Install dependencies based on package.json
COPY package.json ./
RUN npm install

# Setup Forensic Storage
RUN mkdir -p /app/2_OSINT && chmod 777 /app/2_OSINT
ENV OSINT_STORAGE_PATH=/app/2_OSINT

# Copy source code for standalone run if needed
COPY . .

CMD ["npm", "start"]
