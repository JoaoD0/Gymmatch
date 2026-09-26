from app.models.dia_semana import DiaSemana
from app.models.exercicio import Exercicio
from app.models.plano_semanal import DiaTreino, PlanoSemanal
from app.repositories.exercicio_repository import ExercicioRepository
from app.repositories.plano_semanal_repository import PlanoSemanalRepository

MAXIMO_EXERCICIOS_POR_DIA = 15


class LimiteExerciciosError(Exception):
    pass


class ExercicioNaoEncontradoError(Exception):
    pass


class PlanoTreinoService:
    def __init__(self, plano_repository: PlanoSemanalRepository | None = None,
                 exercicio_repository: ExercicioRepository | None = None):
        self._planos = plano_repository or PlanoSemanalRepository()
        self._exercicios = exercicio_repository or ExercicioRepository()

    def obter_plano(self, usuario_id: int) -> PlanoSemanal:
        return PlanoSemanal(
            usuario_id,
            descricoes=self._planos.listar_descricoes(usuario_id),
            exercicios=self._exercicios.listar_por_usuario(usuario_id),
        )

    def salvar_descricao(self, usuario_id: int, dia: DiaSemana, texto: str) -> DiaTreino:
        plano = self.obter_plano(usuario_id)
        dia_treino = plano.atualizar_descricao(dia, texto)
        self._planos.salvar_descricao(usuario_id, dia, dia_treino.descricao)
        return dia_treino

    def adicionar_exercicio(self, usuario_id: int, dia: DiaSemana, nome: str,
                            series: int | None, reps: int | None) -> Exercicio:
        total = self._exercicios.contar_no_dia(usuario_id, dia)
        exercicio = Exercicio(id=None, usuario_id=usuario_id, dia=dia, nome=nome,
                              series=series, reps=reps, posicao=total)
        if total >= MAXIMO_EXERCICIOS_POR_DIA:
            raise LimiteExerciciosError(f"Máximo de {MAXIMO_EXERCICIOS_POR_DIA} exercícios por dia")
        return self._exercicios.criar(exercicio)

    def remover_exercicio(self, usuario_id: int, exercicio_id: int) -> None:
        exercicio = self._exercicios.buscar_por_id(exercicio_id)
        if not exercicio or exercicio.usuario_id != usuario_id:
            raise ExercicioNaoEncontradoError("Exercício não encontrado")
        self._exercicios.deletar_e_reordenar(exercicio)
