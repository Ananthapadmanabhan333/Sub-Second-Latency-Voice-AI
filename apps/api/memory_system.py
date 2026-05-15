import os
import logging
from qdrant_client import QdrantClient
from qdrant_client.http import models
from openai import OpenAI

logger = logging.getLogger("aether-memory")

class MemorySystem:
    def __init__(self):
        self.client = QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
        self.openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.collection_name = "conversational_memory"
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            self.client.get_collection(self.collection_name)
        except Exception:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE),
            )
            logger.info(f"Created memory collection: {self.collection_name}")

    async def store_memory(self, text: str, metadata: dict):
        embedding = self.openai.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        ).data[0].embedding
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=os.urandom(16).hex(),
                    vector=embedding,
                    payload={"text": text, **metadata}
                )
            ]
        )
        logger.info(f"Stored memory: {text[:50]}...")

    async def search_memory(self, query: str, limit: int = 5):
        embedding = self.openai.embeddings.create(
            input=query,
            model="text-embedding-3-small"
        ).data[0].embedding
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=embedding,
            limit=limit
        )
        return [hit.payload["text"] for hit in results]
