from app.database import get_cursor
from app.models.dia_semana import DiaSemana
from app.models.exercicio import Exercicio


class ExercicioRepository:
    @staticmethod
    def _linha_para_exercicio(linha: dict) -> Exercicio:
        return Exercicio(
            id=linha["id"],
            usuario_id=linha["usuario_id"],
            dia=DiaSemana(linha["dia"]),
            nome=linha["nome"],
            series=linha["series"],
            reps=linha["reps"],
            posicao=linha["posicao"],
            criado_em=linha["criado_em"],
        )

    def listar_por_usuario(self, usuario_id: int) -> list[Exercicio]:
        with get_cursor() as cur:
            cur.execute(
                "SELECT * FROM exercicios WHERE usuario_id = %s ORDER BY dia, posicao, id",
                (usuario_id,),
            )
            linhas = cur.fetchall()
        return [self._linha_para_exercicio(l) for l in linhas]

    def contar_no_dia(self, usuario_id: int, dia: DiaSemana) -> int:
        with get_cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS total FROM exercicios WHERE usuario_id = %s AND dia = %s",
                (usuario_id, dia.value),
            )
            return cur.fetchone()["total"]

    def criar(self, exercicio: Exercicio) -> Exercicio:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO exercicios (usuario_id, dia, nome, series, reps, posicao)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (exercicio.usuario_id, exercicio.dia.value, exercicio.nome,
                 exercicio.series, exercicio.reps, exercicio.posicao),
            )
            exercicio._id = cur.lastrowid
        return exercicio

    def buscar_por_id(self, exercicio_id: int) -> Exercicio | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM exercicios WHERE id = %s", (exercicio_id,))
            linha = cur.fetchone()
        return self._linha_para_exercicio(linha) if linha else None

    def deletar_e_reordenar(self, exercicio: Exercicio) -> None:
        """Apaga o exercício e renumera as posições que sobraram no mesmo dia (0, 1, 2...)."""
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM exercicios WHERE id = %s", (exercicio.id,))
            cur.execute(
                "SELECT id FROM exercicios WHERE usuario_id = %s AND dia = %s ORDER BY posicao, id",
                (exercicio.usuario_id, exercicio.dia.value),
            )
            restantes = [l["id"] for l in cur.fetchall()]
            if restantes:
                cur.executemany(
                    "UPDATE exercicios SET posicao = %s WHERE id = %s",
                    [(posicao, id_) for posicao, id_ in enumerate(restantes)],
                )
