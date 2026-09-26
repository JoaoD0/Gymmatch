import re
from datetime import datetime

OBJETIVOS_VALIDOS = {"emagrecer", "hipertrofia", "condicionamento", "saude", "outro"}
NIVEIS_VALIDOS = {"iniciante", "intermediario", "avancado"}
GENEROS_VALIDOS = {"masculino", "feminino", "nao_binario", "outro"}
PROCURANDO_VALIDOS = {"amizade", "parceiro_treino", "romance"}
PERIODOS_VALIDOS = {"manha", "tarde", "noite"}

_CPF_DIGITOS = re.compile(r"\D")


class Perfil:
    """Perfil de treino de um usuário. Composição: todo Perfil pertence a exatamente um Usuario."""

    def __init__(self, usuario_id: int, bio: str = "", objetivo: str = "outro",
                 nivel: str = "iniciante", modalidades: list[str] | None = None,
                 idade: int | None = None, telefone: str = "", cpf: str = "",
                 genero: str | None = None, orientacao_sexual: str = "",
                 procurando: str = "amizade", aberto_a: list[str] | None = None,
                 mostrar_para: list[str] | None = None, quando_treina: list[str] | None = None,
                 divisao_treino: str = "", interesses: list[str] | None = None,
                 foto_url: str | None = None, termos_aceitos_em: datetime | None = None,
                 ocultar_objetivo: bool = False, ocultar_orientacao: bool = False,
                 ocultar_horarios: bool = False, pr_supino: float | None = None,
                 pr_agachamento: float | None = None, pr_terra: float | None = None,
                 atualizado_em: datetime | None = None):
        self._usuario_id = usuario_id
        self.bio = bio
        self.objetivo = objetivo
        self.nivel = nivel
        self._modalidades = modalidades or []
        self.idade = idade
        self.telefone = telefone
        self.cpf = cpf
        self.genero = genero
        self.orientacao_sexual = orientacao_sexual
        self.procurando = procurando
        self._aberto_a = aberto_a or []
        self._mostrar_para = mostrar_para or []
        self._quando_treina = quando_treina or []
        self.divisao_treino = divisao_treino
        self._interesses = interesses or []
        self.foto_url = foto_url
        self._termos_aceitos_em = termos_aceitos_em
        self.ocultar_objetivo = ocultar_objetivo
        self.ocultar_orientacao = ocultar_orientacao
        self.ocultar_horarios = ocultar_horarios
        self.pr_supino = pr_supino
        self.pr_agachamento = pr_agachamento
        self.pr_terra = pr_terra
        self._atualizado_em = atualizado_em or datetime.now()

    # ---------- properties simples ----------
    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def atualizado_em(self) -> datetime:
        return self._atualizado_em

    @property
    def termos_aceitos_em(self) -> datetime | None:
        return self._termos_aceitos_em

    def aceitar_termos(self) -> None:
        self._termos_aceitos_em = datetime.now()

    # ---------- properties validadas ----------
    @property
    def objetivo(self) -> str:
        return self._objetivo

    @objetivo.setter
    def objetivo(self, valor: str):
        if valor not in OBJETIVOS_VALIDOS:
            raise ValueError(f"Objetivo inválido: {valor}")
        self._objetivo = valor

    @property
    def nivel(self) -> str:
        return self._nivel

    @nivel.setter
    def nivel(self, valor: str):
        if valor not in NIVEIS_VALIDOS:
            raise ValueError(f"Nível inválido: {valor}")
        self._nivel = valor

    @property
    def genero(self) -> str | None:
        return self._genero

    @genero.setter
    def genero(self, valor: str | None):
        if valor is not None and valor not in GENEROS_VALIDOS:
            raise ValueError(f"Gênero inválido: {valor}")
        self._genero = valor

    @property
    def procurando(self) -> str:
        return self._procurando

    @procurando.setter
    def procurando(self, valor: str):
        if valor not in PROCURANDO_VALIDOS:
            raise ValueError(f"Valor de 'procurando' inválido: {valor}")
        self._procurando = valor

    @property
    def cpf(self) -> str:
        return self._cpf

    @cpf.setter
    def cpf(self, valor: str):
        digitos = _CPF_DIGITOS.sub("", valor or "")
        if digitos and len(digitos) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        self._cpf = digitos

    # ---------- listas (armazenadas como CSV no banco) ----------
    @property
    def modalidades(self) -> list[str]:
        return list(self._modalidades)

    @modalidades.setter
    def modalidades(self, valor: list[str]):
        self._modalidades = list(valor)

    @property
    def aberto_a(self) -> list[str]:
        return list(self._aberto_a)

    @aberto_a.setter
    def aberto_a(self, valor: list[str]):
        self._aberto_a = list(valor)

    @property
    def mostrar_para(self) -> list[str]:
        return list(self._mostrar_para)

    @mostrar_para.setter
    def mostrar_para(self, valor: list[str]):
        self._mostrar_para = list(valor)

    @property
    def quando_treina(self) -> list[str]:
        return list(self._quando_treina)

    @quando_treina.setter
    def quando_treina(self, valor: list[str]):
        self._quando_treina = list(valor)

    @property
    def interesses(self) -> list[str]:
        return list(self._interesses)

    @interesses.setter
    def interesses(self, valor: list[str]):
        self._interesses = list(valor)

    def modalidades_em_comum(self, outro: "Perfil") -> list[str]:
        return sorted(set(self._modalidades) & set(outro.modalidades))

    # ---------- conversão CSV <-> lista (reaproveitada para todos os campos multi-valor) ----------
    @staticmethod
    def _lista_para_csv(valores: list[str]) -> str:
        return ",".join(valores)

    @staticmethod
    def _csv_para_lista(csv: str | None) -> list[str]:
        if not csv:
            return []
        return [v.strip() for v in csv.split(",") if v.strip()]

    def modalidades_csv(self) -> str:
        return self._lista_para_csv(self._modalidades)

    def aberto_a_csv(self) -> str:
        return self._lista_para_csv(self._aberto_a)

    def mostrar_para_csv(self) -> str:
        return self._lista_para_csv(self._mostrar_para)

    def quando_treina_csv(self) -> str:
        return self._lista_para_csv(self._quando_treina)

    def interesses_csv(self) -> str:
        return self._lista_para_csv(self._interesses)

    @staticmethod
    def modalidades_de_csv(csv: str | None) -> list[str]:
        return Perfil._csv_para_lista(csv)

    def to_dict(self) -> dict:
        return {
            "usuario_id": self._usuario_id,
            "bio": self.bio,
            "objetivo": self._objetivo,
            "nivel": self._nivel,
            "modalidades": self._modalidades,
            "idade": self.idade,
            "telefone": self.telefone,
            "cpf": self._cpf,
            "genero": self._genero,
            "orientacao_sexual": self.orientacao_sexual,
            "procurando": self._procurando,
            "aberto_a": self._aberto_a,
            "mostrar_para": self._mostrar_para,
            "quando_treina": self._quando_treina,
            "divisao_treino": self.divisao_treino,
            "interesses": self._interesses,
            "foto_url": self.foto_url,
            "termos_aceitos_em": self._termos_aceitos_em.isoformat() if self._termos_aceitos_em else None,
            "ocultar_objetivo": self.ocultar_objetivo,
            "ocultar_orientacao": self.ocultar_orientacao,
            "ocultar_horarios": self.ocultar_horarios,
            "pr_supino": float(self.pr_supino) if self.pr_supino is not None else None,
            "pr_agachamento": float(self.pr_agachamento) if self.pr_agachamento is not None else None,
            "pr_terra": float(self.pr_terra) if self.pr_terra is not None else None,
            "atualizado_em": self._atualizado_em.isoformat() if self._atualizado_em else None,
        }
