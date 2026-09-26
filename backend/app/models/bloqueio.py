from datetime import datetime


class Bloqueio:
    def __init__(self, id: int | None, bloqueador_id: int, bloqueado_id: int,
                 criado_em: datetime | None = None):
        if bloqueador_id == bloqueado_id:
            raise ValueError("Um usuário não pode bloquear a si mesmo")
        self._id = id
        self._bloqueador_id = bloqueador_id
        self._bloqueado_id = bloqueado_id
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def bloqueador_id(self) -> int:
        return self._bloqueador_id

    @property
    def bloqueado_id(self) -> int:
        return self._bloqueado_id

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "bloqueador_id": self._bloqueador_id,
            "bloqueado_id": self._bloqueado_id,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
