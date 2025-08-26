# crawl and sentiment analysis service

**Port**
5003

**Run app**
-- Create environment (use for first time only)
python -m venv venv
-- Activate environment 
venv\Scripts\activate 

pip install -r requirements.txt (use for first time or changes in requirements.txt)
uvicorn app.main:app --reload --host 0.0.0.0 --port 5003

**Escape venv mode**
deactivate

**Automatically create file 'requirements.txt'**
pip freeze > requirements.txt

**Test service**
http://127.0.0.1:5003/api/v1/(routes)
For example: http://127.0.0.1:5003/api/v1/news --> To access news router

**Use with docker**
Head to the directory of CrawlerAndSentiment

Build the image: 
docker build -t news-service .

Run it: 
docker run -p 5003:5003 news-service

Visit http://localhost:5003/docs to see if the API docs load