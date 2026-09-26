from datetime import datetime


class CurtidaPost:
    def __init__(self, post_id: int, usuario_id: int, criado_em: datetime | None = None):
        self._post_id = post_id
        self._usuario_id = usuario_id
        self._criado_em = criado_em or datetime.now()

    @property
    def post_id(self) -> int:
        return self._post_id

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    def to_dict(self) -> dict:
        return {
            "post_id": self._post_id,
            "usuario_id": self._usuario_id,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
