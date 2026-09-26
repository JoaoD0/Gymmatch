from datetime import date
from enum import Enum


class DiaSemana(Enum):
    """Dias da semana na ordem de segunda a domingo (a mesma ordem de date.weekday())."""

    SEG = "seg"
    TER = "ter"
    QUA = "qua"
    QUI = "qui"
    SEX = "sex"
    SAB = "sab"
    DOM = "dom"

    @property
    def curto(self) -> str:
        return _CURTOS[self]

    @property
    def nome(self) -> str:
        return _NOMES[self]

    @classmethod
    def hoje(cls) -> "DiaSemana":
        return list(cls)[date.today().weekday()]


_CURTOS = {
    DiaSemana.SEG: "SEG", DiaSemana.TER: "TER", DiaSemana.QUA: "QUA", DiaSemana.QUI: "QUI",
    DiaSemana.SEX: "SEX", DiaSemana.SAB: "SÁB", DiaSemana.DOM: "DOM",
}

_NOMES = {
    DiaSemana.SEG: "Segunda", DiaSemana.TER: "Terça", DiaSemana.QUA: "Quarta", DiaSemana.QUI: "Quinta",
    DiaSemana.SEX: "Sexta", DiaSemana.SAB: "Sábado", DiaSemana.DOM: "Domingo",
}
