from datetime import datetime

MOTIVOS_VALIDOS = {
    "assedio",
    "linguagem_ofensiva",
    "comportamento_inadequado",
    "perfil_falso",
    "spam",
    "racismo",
}


class Denuncia:
    def __init__(self, id: int | None, denunciante_id: int, denunciado_id: int,
                 motivo: str, move_id: int | None = None, post_id: int | None = None,
                 criado_em: datetime | None = None):
        if denunciante_id == denunciado_id:
            raise ValueError("Um usuário não pode denunciar a si mesmo")
        self._id = id
        self._denunciante_id = denunciante_id
        self._denunciado_id = denunciado_id
        self.motivo = motivo
        self.move_id = move_id
        self.post_id = post_id
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def denunciante_id(self) -> int:
        return self._denunciante_id

    @property
    def denunciado_id(self) -> int:
        return self._denunciado_id

    @property
    def motivo(self) -> str:
        return self._motivo

    @motivo.setter
    def motivo(self, valor: str):
        if valor not in MOTIVOS_VALIDOS:
            raise ValueError(f"Motivo de denúncia inválido: {valor}")
        self._motivo = valor

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "denunciante_id": self._denunciante_id,
            "denunciado_id": self._denunciado_id,
            "motivo": self._motivo,
            "move_id": self.move_id,
            "post_id": self.post_id,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
        }
