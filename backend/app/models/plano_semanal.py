from app.models.dia_semana import DiaSemana
from app.models.exercicio import Exercicio


class DiaTreino:
    """Um dia do plano: a descrição curta e os exercícios daquele dia (composição)."""

    def __init__(self, dia: DiaSemana, descricao: str = "", exercicios: list[Exercicio] | None = None):
        self._dia = dia
        self.descricao = descricao
        self._exercicios = sorted(exercicios or [], key=lambda e: e.posicao)

    @property
    def dia(self) -> DiaSemana:
        return self._dia

    @property
    def descricao(self) -> str:
        return self._descricao

    @descricao.setter
    def descricao(self, valor: str | None):
        limpo = (valor or "").strip()
        if len(limpo) > 60:
            raise ValueError("A descrição do dia deve ter no máximo 60 caracteres")
        self._descricao = limpo

    @property
    def exercicios(self) -> list[Exercicio]:
        return list(self._exercicios)

    def eh_descanso(self) -> bool:
        return self._descricao == ""

    def quantidade_exercicios(self) -> int:
        return len(self._exercicios)

    def to_dict(self) -> dict:
        return {
            "dia": self._dia.value,
            "curto": self._dia.curto,
            "nome": self._dia.nome,
            "descricao": self._descricao,
            "exercicios": [e.to_dict() for e in self._exercicios],
        }


class PlanoSemanal:
    """Sempre contém os 7 dias; um dia sem registro no banco vira descanso vazio."""

    def __init__(self, usuario_id: int, descricoes: dict[DiaSemana, str] | None = None,
                 exercicios: list[Exercicio] | None = None):
        self._usuario_id = usuario_id
        descricoes = descricoes or {}
        por_dia: dict[DiaSemana, list[Exercicio]] = {d: [] for d in DiaSemana}
        for exercicio in exercicios or []:
            por_dia[exercicio.dia].append(exercicio)
        self._dias = {d: DiaTreino(d, descricoes.get(d, ""), por_dia[d]) for d in DiaSemana}

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    def dia(self, dia: DiaSemana) -> DiaTreino:
        return self._dias[dia]

    def dias(self) -> list[DiaTreino]:
        return [self._dias[d] for d in DiaSemana]

    def atualizar_descricao(self, dia: DiaSemana, texto: str) -> DiaTreino:
        self._dias[dia].descricao = texto
        return self._dias[dia]

    def dias_com_exercicios(self) -> list[DiaTreino]:
        return [d for d in self.dias() if d.quantidade_exercicios() > 0]

    def to_list(self) -> list[dict]:
        return [d.to_dict() for d in self.dias()]
