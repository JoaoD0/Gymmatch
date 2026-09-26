from datetime import datetime


class Match:
    def __init__(self, id: int | None, usuario1_id: int, usuario2_id: int,
                 ativo: bool = True, criado_em: datetime | None = None):
        self._id = id
        self._usuario1_id = usuario1_id
        self._usuario2_id = usuario2_id
        self.ativo = ativo
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def usuario1_id(self) -> int:
        return self._usuario1_id

    @property
    def usuario2_id(self) -> int:
        return self._usuario2_id

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    def encerrar(self) -> None:
        self.ativo = False

    def envolve(self, usuario_id: int) -> bool:
        return usuario_id in (self._usuario1_id, self._usuario2_id)

    def outro_usuario(self, usuario_id: int) -> int:
        if usuario_id == self._usuario1_id:
            return self._usuario2_id
        if usuario_id == self._usuario2_id:
            return self._usuario1_id
        raise ValueError("Usuário não faz parte deste match")

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "usuario1_id": self._usuario1_id,
            "usuario2_id": self._usuario2_id,
            "ativo": self.ativo,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
