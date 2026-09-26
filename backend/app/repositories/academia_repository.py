from app.database import get_cursor
from app.models.academia import Academia


class AcademiaRepository:
    @staticmethod
    def _linha_para_academia(linha: dict) -> Academia:
        return Academia(
            id=linha["id"],
            nome=linha["nome"],
            endereco=linha["endereco"] or "",
            criado_em=linha["criado_em"],
        )

    def criar(self, academia: Academia) -> Academia:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO academias (nome, endereco) VALUES (%s, %s)",
                (academia.nome, academia.endereco),
            )
            academia._id = cur.lastrowid
        return academia

    def listar(self) -> list[Academia]:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM academias ORDER BY nome")
            linhas = cur.fetchall()
        return [self._linha_para_academia(l) for l in linhas]

    def buscar_por_id(self, academia_id: int) -> Academia | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM academias WHERE id = %s", (academia_id,))
            linha = cur.fetchone()
        return self._linha_para_academia(linha) if linha else None
