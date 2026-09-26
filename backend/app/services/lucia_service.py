import logging
import os
from dataclasses import dataclass

from dotenv import load_dotenv

from app.models.lucia import (
    GuardrailsLucia,
    LimitadorTaxa,
    MensagemLucia,
    MotivoRecusa,
    MotorGroq,
    MotorLucia,
    MotorRegras,
)

load_dotenv()
logger = logging.getLogger("gymmatch.lucia")

MAXIMO_HISTORICO = 20


@dataclass
class RespostaLucia:
    resposta: str
    recusada: bool = False
    motivo: MotivoRecusa | None = None

    def to_dict(self) -> dict:
        return {"resposta": self.resposta, "recusada": self.recusada,
                "motivo": self.motivo.value if self.motivo else None}


def motores_padrao() -> list[MotorLucia]:
    """Com GROQ_API_KEY no .env, tenta a IA primeiro; sem ela (ou se a IA falhar), usa as regras."""
    chave = os.getenv("GROQ_API_KEY", "").strip()
    regras = MotorRegras()
    modelo = os.getenv("GROQ_MODEL", "").strip() or None
    return [MotorGroq(chave, modelo), regras] if chave else [regras]


class LuciaService:
    def __init__(self, motores: list[MotorLucia] | None = None,
                 guardrails: GuardrailsLucia | None = None,
                 limitador: LimitadorTaxa | None = None):
        self._motores = motores or motores_padrao()
        self._guardrails = guardrails or GuardrailsLucia()
        self._limitador = limitador or LimitadorTaxa()
        self._regras = next((m for m in self._motores if isinstance(m, MotorRegras)), MotorRegras())

    def atalhos(self) -> list[str]:
        return list(MotorRegras.ATALHOS)

    def responder_atalho(self, rotulo: str) -> RespostaLucia:
        return RespostaLucia(self._regras.responder_atalho(rotulo))

    def responder(self, usuario_id: int, historico: list[MensagemLucia], texto: str) -> RespostaLucia:
        motivo = self._guardrails.verificar_entrada(texto)
        if motivo is None and not self._limitador.permitir(usuario_id):
            motivo = MotivoRecusa.LIMITE
        if motivo:
            return RespostaLucia(GuardrailsLucia.RESPOSTAS_SEGURANCA[motivo], recusada=True, motivo=motivo)

        conversa = historico[-MAXIMO_HISTORICO:] + [MensagemLucia("usuario", texto)]
        for motor in self._motores:
            try:
                resposta = motor.responder(conversa)
            except Exception as erro:
                # só o tipo do erro: a mensagem de um erro HTTP poderia trazer detalhes da requisição
                logger.warning("Motor da Lucia '%s' falhou (%s); tentando o próximo", motor.nome, type(erro).__name__)
                continue
            if self._guardrails.verificar_resposta(resposta):
                return RespostaLucia(resposta)
            logger.warning("Resposta do motor '%s' reprovada pelos filtros; tentando o próximo", motor.nome)
        return RespostaLucia(GuardrailsLucia.RESPOSTA_REPROVADA)
