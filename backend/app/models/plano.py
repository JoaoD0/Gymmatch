from abc import ABC, abstractmethod


class Plano(ABC):
    """Classe base dos planos de assinatura do GymMatch.

    Os limites concretos (curtidas/dia, matches, etc.) já vêm com os valores do
    plano Grátis por padrão — as subclasses pagas sobrescrevem só o que muda,
    evitando um `if plano == "gold"` espalhado pelo resto do código.
    """

    @property
    @abstractmethod
    def chave(self) -> str: ...

    @property
    @abstractmethod
    def nome(self) -> str: ...

    @property
    @abstractmethod
    def preco_mensal(self) -> float: ...

    @property
    @abstractmethod
    def tagline(self) -> str: ...

    @property
    @abstractmethod
    def beneficios(self) -> list[str]: ...

    def limite_curtidas_diarias(self) -> int | None:
        """None = ilimitado."""
        return 20

    def limite_matches(self) -> int | None:
        """None = ilimitado."""
        return 5

    def pode_desfazer_curtida(self) -> bool:
        return False

    def curtidas_recebidas_visiveis(self) -> int | None:
        """Quantos perfis de quem curtiu o usuário podem ser mostrados. 0 = nenhum, None = todos."""
        return 0

    def to_dict(self) -> dict:
        return {
            "chave": self.chave,
            "nome": self.nome,
            "preco_mensal": self.preco_mensal,
            "tagline": self.tagline,
            "beneficios": self.beneficios,
        }

    @staticmethod
    def por_chave(chave: str) -> "Plano":
        classes = {"gratis": PlanoGratis, "gold": PlanoGold, "diamond": PlanoDiamond}
        classe = classes.get(chave)
        if not classe:
            raise ValueError(f"Plano desconhecido: {chave}")
        return classe()


class PlanoGratis(Plano):
    @property
    def chave(self) -> str:
        return "gratis"

    @property
    def nome(self) -> str:
        return "Grátis"

    @property
    def preco_mensal(self) -> float:
        return 0.0

    @property
    def tagline(self) -> str:
        return "Para começar a explorar"

    @property
    def beneficios(self) -> list[str]:
        return ["20 curtidas por dia", "5 matches", "Chat de texto"]


class PlanoGold(Plano):
    @property
    def chave(self) -> str:
        return "gold"

    @property
    def nome(self) -> str:
        return "Gold"

    @property
    def preco_mensal(self) -> float:
        return 29.90

    @property
    def tagline(self) -> str:
        return "Para quem quer mais conexões"

    @property
    def beneficios(self) -> list[str]:
        return [
            "Curtidas ilimitadas",
            "Até 20 matches",
            "Desfazer última curtida",
            "Ver quem te curtiu (5 perfis)",
        ]

    def limite_curtidas_diarias(self) -> int | None:
        return None

    def limite_matches(self) -> int | None:
        return 20

    def pode_desfazer_curtida(self) -> bool:
        return True

    def curtidas_recebidas_visiveis(self) -> int | None:
        return 5


class PlanoDiamond(PlanoGold):
    """Herda de Gold — Diamond é um Gold sem limite de matches e sem limite de visibilidade."""

    @property
    def chave(self) -> str:
        return "diamond"

    @property
    def nome(self) -> str:
        return "Diamond"

    @property
    def preco_mensal(self) -> float:
        return 59.90

    @property
    def tagline(self) -> str:
        return "Sem limites, sem fila"

    @property
    def beneficios(self) -> list[str]:
        return [
            "Tudo do Gold",
            "Matches ilimitados",
            "Ver todos que te curtiram",
            "Badge Diamond no perfil",
        ]

    def limite_matches(self) -> int | None:
        return None

    def curtidas_recebidas_visiveis(self) -> int | None:
        return None
