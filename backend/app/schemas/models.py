from typing import Literal, Optional

from pydantic import BaseModel, Field


class ReplyRequest(BaseModel):
    tone: Literal["Professional", "Friendly", "Empathetic"] = "Professional"
    variant: int = Field(default=0, ge=0, le=1000, description="Increment to regenerate a different template draft")


class ReplyResponse(BaseModel):
    review_id: str
    tone: str
    draft: str
    source: Literal["template", "llm"]
    fallback_reason: Optional[str]
    requires_human_review: bool
    disclaimer: str
    safety_note: Optional[str]


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody
