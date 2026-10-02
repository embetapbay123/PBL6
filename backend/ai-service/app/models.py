# GENERATED baseline SQLAlchemy models; retain bigint as Python int.
from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base
from pgvector.sqlalchemy import Vector
Base = declarative_base()
class ChatSession(Base):
    __tablename__ = "chat_session"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), primary_key=False, nullable=True)
    anonymous_key = Column(String, primary_key=False, nullable=True)
    status = Column(String, primary_key=False, nullable=False)
    created_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
class ChatMessage(Base):
    __tablename__ = "chat_message"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    session_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    role = Column(String, primary_key=False, nullable=False)
    content = Column(Text, primary_key=False, nullable=False)
    product_refs = Column(JSONB, primary_key=False, nullable=True)
    created_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    query = Column(Text, primary_key=False, nullable=False)
    created_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
class RecommendationInteraction(Base):
    __tablename__ = "recommendation_interaction"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    product_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    event_id = Column(String, primary_key=False, nullable=False)
    event_type = Column(String, primary_key=False, nullable=False)
    weight = Column(Integer, primary_key=False, nullable=False)
    occurred_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
class PersonalizationConsent(Base):
    __tablename__ = "personalization_consent"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    status = Column(String, primary_key=False, nullable=False)
    source = Column(String, primary_key=False, nullable=False)
    changed_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
    version = Column(Integer, primary_key=False, nullable=False)
class UserPreference(Base):
    __tablename__ = "user_preference"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    profile_json = Column(JSONB, primary_key=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
class ProductEmbedding(Base):
    __tablename__ = "product_embedding"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    product_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    source_version = Column(Integer, primary_key=False, nullable=False)
    vector = Column(Vector(1536), primary_key=False, nullable=False)
    status = Column(String, primary_key=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
class ModelVersion(Base):
    __tablename__ = "model_version"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    algorithm = Column(String, primary_key=False, nullable=False)
    version = Column(String, primary_key=False, nullable=False)
    artifact_uri = Column(String, primary_key=False, nullable=False)
    status = Column(String, primary_key=False, nullable=False)
    trained_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
class TrainingRun(Base):
    __tablename__ = "training_run"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    model_version_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    dataset_version = Column(String, primary_key=False, nullable=False)
    split_spec = Column(JSONB, primary_key=False, nullable=False)
    status = Column(String, primary_key=False, nullable=False)
    started_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
    finished_at = Column(DateTime(timezone=True), primary_key=False, nullable=True)
class ModelEvaluation(Base):
    __tablename__ = "model_evaluation"
    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    training_run_id = Column(UUID(as_uuid=True), primary_key=False, nullable=False)
    baseline_name = Column(String, primary_key=False, nullable=False)
    k = Column(Integer, primary_key=False, nullable=False)
    precision_at_k = Column(Numeric, primary_key=False, nullable=False)
    recall_at_k = Column(Numeric, primary_key=False, nullable=False)
    ndcg_at_k = Column(Numeric, primary_key=False, nullable=False)
    evaluated_at = Column(DateTime(timezone=True), primary_key=False, nullable=False)
