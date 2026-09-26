from datetime import datetime

from app.models.dia_semana import DiaSemana


class Exercicio:
    def __init__(self, id: int | None, usuario_id: int, dia: DiaSemana, nome: str,
                 series: int | None = None, reps: int | None = None, posicao: int = 0,
                 criado_em: datetime | None = None):
        self._id = id
        self._usuario_id = usuario_id
        self.dia = dia
        self.nome = nome
        self.series = series
        self.reps = reps
        self.posicao = posicao
        self._criado_em = criado_em or datetime.now()

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    @property
    def dia(self) -> DiaSemana:
        return self._dia

    @dia.setter
    def dia(self, valor: DiaSemana | str):
        self._dia = DiaSemana(valor)

    @property
    def nome(self) -> str:
        return self._nome

    @nome.setter
    def nome(self, valor: str):
        limpo = (valor or "").strip()
        if not limpo:
            raise ValueError("Nome do exercício não pode ser vazio")
        if len(limpo) > 60:
            raise ValueError("Nome do exercício deve ter no máximo 60 caracteres")
        self._nome = limpo

    @property
    def series(self) -> int | None:
        return self._series

    @series.setter
    def series(self, valor: int | None):
        if valor is not None and not 1 <= valor <= 20:
            raise ValueError("Séries devem estar entre 1 e 20")
        self._series = valor

    @property
    def reps(self) -> int | None:
        return self._reps

    @reps.setter
    def reps(self, valor: int | None):
        if valor is not None and not 1 <= valor <= 100:
            raise ValueError("Repetições devem estar entre 1 e 100")
        self._reps = valor

    @property
    def posicao(self) -> int:
        return self._posicao

    @posicao.setter
    def posicao(self, valor: int):
        if valor < 0:
            raise ValueError("Posição inválida")
        self._posicao = valor

    def resumo(self) -> str | None:
        """'4×12', '4×—', '—×12' ou None quando não há séries nem repetições."""
        if self._series is None and self._reps is None:
            return None
        series = self._series if self._series is not None else "—"
        reps = self._reps if self._reps is not None else "—"
        return f"{series}×{reps}"

    def to_dict(self) -> dict:
        return {
            "id": self._id,
            "nome": self._nome,
            "series": self._series,
            "reps": self._reps,
            "resumo": self.resumo(),
        }
