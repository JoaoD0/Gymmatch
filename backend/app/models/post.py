from abc import ABC, abstractmethod
from datetime import datetime


class Post(ABC):
    """Publicação no mural da academia. Precisa ter texto ou foto (ou os dois)."""

    def __init__(self, id: int | None, autor_id: int, academia_id: int, texto: str | None = None,
                 foto_url: str | None = None, criado_em: datetime | None = None):
        texto_limpo = (texto or "").strip() or None
        if not texto_limpo and not foto_url:
            raise ValueError("O post precisa ter texto ou foto")
        if texto_limpo and len(texto_limpo) > 500:
            raise ValueError("Texto do post deve ter no máximo 500 caracteres")

        self._id = id
        self._autor_id = autor_id
        self._academia_id = academia_id
        self._texto = texto_limpo
        self.foto_url = foto_url
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def autor_id(self) -> int:
        return self._autor_id

    @property
    def academia_id(self) -> int:
        return self._academia_id

    @property
    def texto(self) -> str | None:
        return self._texto

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    @property
    @abstractmethod
    def tipo(self) -> str: ...

    def rotulo(self) -> str | None:
        """Sobrescrito pelas subclasses especiais (PR, check-in)."""
        return None

    def tempo_decorrido(self) -> str:
        minutos = int((datetime.now() - self._criado_em).total_seconds() // 60)
        if minutos < 1:
            return "agora"
        if minutos < 60:
            return f"{minutos}min"
        horas = minutos // 60
        if horas < 24:
            return f"{horas}h"
        dias = horas // 24
        return f"{dias}d"

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "tipo": self.tipo,
            "rotulo": self.rotulo(),
            "texto": self._texto,
            "foto_url": self.foto_url,
            "criado_em": self._criado_em.isoformat() if self._criado_em else None,
            "tempo": self.tempo_decorrido(),
        }

    @staticmethod
    def criar(tipo: str, **dados) -> "Post":
        """Fábrica usada pelo repositório para montar a subclasse certa a partir da linha do banco."""
        classes = {"manual": PostManual, "pr": PostRecorde, "checkin": PostCheckin}
        classe = classes.get(tipo, PostManual)
        return classe(**dados)


class PostManual(Post):
    """Post comum, escrito pelo próprio usuário."""

    @property
    def tipo(self) -> str:
        return "manual"


class PostRecorde(Post):
    """Post automático quando o usuário bate um recorde pessoal (PR)."""

    @property
    def tipo(self) -> str:
        return "pr"

    def rotulo(self) -> str | None:
        return "🏆 Novo PR"


class PostCheckin(Post):
    """Post automático de check-in na academia (preparado para quando a tela de Treino existir)."""

    @property
    def tipo(self) -> str:
        return "checkin"

    def rotulo(self) -> str | None:
        return "📍 Check-in"
