from app.database import get_cursor
from app.models.dia_semana import DiaSemana


class PlanoSemanalRepository:
    def listar_descricoes(self, usuario_id: int) -> dict[DiaSemana, str]:
        with get_cursor() as cur:
            cur.execute("SELECT dia, descricao FROM plano_semanal WHERE usuario_id = %s", (usuario_id,))
            linhas = cur.fetchall()
        return {DiaSemana(l["dia"]): l["descricao"] or "" for l in linhas}

    def salvar_descricao(self, usuario_id: int, dia: DiaSemana, descricao: str) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO plano_semanal (usuario_id, dia, descricao) VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE descricao = VALUES(descricao)""",
                (usuario_id, dia.value, descricao),
            )
