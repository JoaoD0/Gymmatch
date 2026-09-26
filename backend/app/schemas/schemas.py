from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------- Auth ----------
class CadastroRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=100)
    academia_id: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    tipo: str
    academia_id: int | None
    status: str = "ativo"


class LoginResponse(BaseModel):
    usuario: UsuarioResponse
    token: str


class AtualizarNomeRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=120)


class AtualizarStatusRequest(BaseModel):
    status: str  # "ativo" | "pausado"


class AlterarSenhaRequest(BaseModel):
    senha_atual: str
    nova_senha: str = Field(min_length=6, max_length=100)


# ---------- Perfil ----------
class PerfilRequest(BaseModel):
    bio: str = ""
    objetivo: str = "outro"
    nivel: str = "iniciante"
    modalidades: list[str] = []
    idade: int | None = None
    telefone: str = ""
    cpf: str = ""
    genero: str | None = None
    orientacao_sexual: str = ""
    procurando: str = "amizade"
    aberto_a: list[str] = []
    mostrar_para: list[str] = []
    quando_treina: list[str] = []
    divisao_treino: str = ""
    interesses: list[str] = []
    aceitar_termos: bool = False
    ocultar_objetivo: bool = False
    ocultar_orientacao: bool = False
    ocultar_horarios: bool = False
    pr_supino: float | None = None
    pr_agachamento: float | None = None
    pr_terra: float | None = None


class PerfilResponse(BaseModel):
    usuario_id: int
    bio: str
    objetivo: str
    nivel: str
    modalidades: list[str]
    idade: int | None
    telefone: str
    cpf: str
    genero: str | None
    orientacao_sexual: str
    procurando: str | None
    aberto_a: list[str]
    mostrar_para: list[str]
    quando_treina: list[str]
    divisao_treino: str
    interesses: list[str]
    foto_url: str | None
    termos_aceitos_em: datetime | None
    ocultar_objetivo: bool = False
    ocultar_orientacao: bool = False
    ocultar_horarios: bool = False
    pr_supino: float | None = None
    pr_agachamento: float | None = None
    pr_terra: float | None = None
    boost_expira_em: datetime | None = None
    plano: str = "gratis"


class FotoPerfilResponse(BaseModel):
    foto_url: str


# ---------- Galeria de fotos ----------
class FotoGaleriaResponse(BaseModel):
    id: int
    usuario_id: int
    url: str
    posicao: int
    criado_em: datetime


class TrocarFotosRequest(BaseModel):
    foto_a: int
    foto_b: int


# ---------- Boost ----------
class BoostResponse(BaseModel):
    id: int
    usuario_id: int
    ativado_em: datetime
    expira_em: datetime


# ---------- Academia ----------
class AcademiaRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    endereco: str = ""


class AcademiaResponse(BaseModel):
    id: int
    nome: str
    endereco: str


# ---------- Discover ----------
class PerfilParaDescobrirResponse(BaseModel):
    usuario: UsuarioResponse
    perfil: PerfilResponse | None
    na_academia_agora: bool = False


class CurtirRequest(BaseModel):
    para_usuario_id: int


class RecusarRequest(BaseModel):
    para_usuario_id: int


class CurtirResponse(BaseModel):
    match: bool
    match_id: int | None = None


class CurtidaRecebidaResponse(BaseModel):
    usuario: UsuarioResponse
    perfil: PerfilResponse | None


class CurtidasRecebidasResponse(BaseModel):
    total: int
    curtidas: list[CurtidaRecebidaResponse]


# ---------- Planos ----------
class PlanoResponse(BaseModel):
    chave: str
    nome: str
    preco_mensal: float
    tagline: str
    beneficios: list[str]


class PlanoAtualResponse(BaseModel):
    plano: PlanoResponse
    ativa: bool
    expira_em: datetime | None = None
    dias_restantes: int | None = None
    cartao_final: str | None = None
    cartao_bandeira: str | None = None


class AssinarPlanoRequest(BaseModel):
    plano: str
    cartao_final: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")
    cartao_bandeira: str = Field(min_length=1, max_length=20)


# ---------- Match ----------
class MatchResponse(BaseModel):
    id: int
    usuario1_id: int
    usuario2_id: int
    ativo: bool = True
    criado_em: datetime


class OutroMatchResponse(BaseModel):
    id: int
    nome: str
    foto_url: str | None
    idade: int | None


class UltimaMensagemResponse(BaseModel):
    texto: str
    remetente_id: int
    criado_em: datetime


class MatchResumoResponse(BaseModel):
    id: int
    criado_em: datetime
    outro: OutroMatchResponse
    ultima_mensagem: UltimaMensagemResponse | None
    nova: bool
    modalidades_em_comum: list[str]


class DenunciarRequest(BaseModel):
    motivo: str


# ---------- Chat ----------
class MensagemRequest(BaseModel):
    texto: str = Field(min_length=1, max_length=1000)


class MensagemResponse(BaseModel):
    id: int
    match_id: int
    remetente_id: int
    texto: str
    criado_em: datetime


class OutroChatResponse(BaseModel):
    id: int
    nome: str
    foto_url: str | None


class ChatCabecalhoResponse(BaseModel):
    match_id: int
    ativo: bool
    outro: OutroChatResponse


# ---------- Moves ----------
class MoveResponse(BaseModel):
    id: int
    texto: str
    foto_url: str
    tag: str | None
    criado_em: datetime
    expira_em: datetime
    tempo: str


class AutorMoveResponse(BaseModel):
    id: int
    nome: str
    foto_url: str | None


class GrupoMovesResponse(BaseModel):
    usuario: AutorMoveResponse
    moves: list[MoveResponse]


class MovesResponse(BaseModel):
    meus: list[MoveResponse]
    grupos: list[GrupoMovesResponse]


# ---------- Feed ----------
class AutorPostResponse(BaseModel):
    id: int
    nome: str
    foto_url: str | None


class PostResponse(BaseModel):
    id: int
    tipo: str
    rotulo: str | None
    texto: str | None
    foto_url: str | None
    criado_em: datetime
    tempo: str
    autor: AutorPostResponse
    curtidas_total: int
    curtido_por_mim: bool
    pode_excluir: bool


class FeedResponse(BaseModel):
    posts: list[PostResponse]
    tem_mais: bool


class NovosPostsResponse(BaseModel):
    quantidade: int


class CurtirPostResponse(BaseModel):
    curtidas_total: int
    curtido_por_mim: bool


# ---------- Treino ----------
def _exigir_hora_local(valor: datetime) -> datetime:
    """Horários de treino são hora local, sem fuso ("YYYY-MM-DDTHH:MM"), como o usuário digitou."""
    if valor.tzinfo is not None:
        raise ValueError("Envie a data e a hora sem fuso horário (ex.: 2026-09-25T18:30)")
    return valor.replace(second=0, microsecond=0)


class DescricaoDiaRequest(BaseModel):
    descricao: str = ""


class ExercicioRequest(BaseModel):
    dia: str
    nome: str
    series: int | None = None
    reps: int | None = None


class CheckInRequest(BaseModel):
    publicar_no_feed: bool = False


class ConviteTreinoRequest(BaseModel):
    destinatario_id: int
    agendado_para: datetime
    academia_id: int

    @field_validator("agendado_para")
    @classmethod
    def validar_hora_local(cls, valor: datetime) -> datetime:
        return _exigir_hora_local(valor)


class SessaoGrupoRequest(BaseModel):
    membros_ids: list[int]
    agendada_para: datetime
    academia_id: int
    descricao: str | None = None

    @field_validator("agendada_para")
    @classmethod
    def validar_hora_local(cls, valor: datetime) -> datetime:
        return _exigir_hora_local(valor)


class ExercicioResponse(BaseModel):
    id: int
    nome: str
    series: int | None
    reps: int | None
    resumo: str | None


class DiaTreinoResponse(BaseModel):
    dia: str
    curto: str
    nome: str
    descricao: str
    exercicios: list[ExercicioResponse]


class CheckInResponse(BaseModel):
    ativo: bool
    feito_em: datetime
    expira_em: datetime
    tempo_restante: str


class AcademiaResumoResponse(BaseModel):
    id: int
    nome: str


class PessoaResponse(BaseModel):
    id: int
    nome: str
    foto_url: str | None


class ConviteTreinoResponse(BaseModel):
    id: int
    status: str
    sou_remetente: bool
    agendado_para: datetime
    passado: bool
    academia: AcademiaResumoResponse
    outro: PessoaResponse


class MembroSessaoResponse(PessoaResponse):
    status: str


class SessaoGrupoResponse(BaseModel):
    id: int
    sou_criador: bool
    meu_status: str | None
    agendada_para: datetime
    descricao: str | None
    academia: AcademiaResumoResponse
    criador: PessoaResponse
    membros: list[MembroSessaoResponse]
    confirmados: int
    total_pessoas: int


class MatchTreinoResponse(PessoaResponse):
    academia: AcademiaResumoResponse | None


class TreinoResponse(BaseModel):
    hoje: str
    plano: list[DiaTreinoResponse]
    checkin: CheckInResponse | None
    convites: list[ConviteTreinoResponse]
    sessoes: list[SessaoGrupoResponse]
    matches: list[MatchTreinoResponse]
    pendentes_recebidos: int


class PendentesResponse(BaseModel):
    quantidade: int


# ---------- Lucia ----------
class MensagemLuciaSchema(BaseModel):
    papel: str
    conteudo: str


class LuciaMensagemRequest(BaseModel):
    historico: list[MensagemLuciaSchema] = []
    texto: str = Field(min_length=1)


class LuciaAtalhoRequest(BaseModel):
    rotulo: str


class LuciaRespostaResponse(BaseModel):
    resposta: str
    recusada: bool
    motivo: str | None
