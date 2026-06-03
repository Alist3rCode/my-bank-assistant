import httpx
from datetime import datetime
from app.core.config import settings


class BridgeService:
    """
    Wrapper pour Bridge API (DSP2 Open Banking).
    Docs: https://docs.bridgeapi.io
    """

    def __init__(self):
        self.base_url = settings.BRIDGE_API_URL
        self.headers = {
            "Client-Id": settings.BRIDGE_CLIENT_ID,
            "Client-Secret": settings.BRIDGE_CLIENT_SECRET,
            "Bridge-Version": "2021-06-01",
            "Content-Type": "application/json",
        }

    def _client(self) -> httpx.Client:
        return httpx.Client(base_url=self.base_url, headers=self.headers, timeout=30)

    def get_connect_url(self, user_uuid: str, redirect_url: str) -> str:
        """Génère l'URL de connexion Bridge pour un utilisateur."""
        with self._client() as client:
            resp = client.post("/connect/items/add/url", json={
                "user_uuid": user_uuid,
                "redirect_url": redirect_url,
                "country": "fr",
            })
            resp.raise_for_status()
            return resp.json()["redirect_url"]

    def create_bridge_user(self, external_user_id: str) -> dict:
        """Crée un utilisateur Bridge lié à notre utilisateur."""
        with self._client() as client:
            resp = client.post("/aggregation/users", json={"external_user_id": external_user_id})
            resp.raise_for_status()
            return resp.json()

    def list_accounts(self, user_access_token: str) -> list[dict]:
        """Récupère tous les comptes de l'utilisateur via son access token Bridge."""
        headers = {**self.headers, "Authorization": f"Bearer {user_access_token}"}
        with httpx.Client(base_url=self.base_url, headers=headers, timeout=30) as client:
            resp = client.get("/aggregation/accounts")
            resp.raise_for_status()
            return resp.json().get("resources", [])

    def list_transactions(
        self,
        user_access_token: str,
        account_id: int | None = None,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[dict]:
        """Récupère les transactions (avec pagination auto jusqu'à `limit`)."""
        headers = {**self.headers, "Authorization": f"Bearer {user_access_token}"}
        params: dict = {"limit": min(limit, 500)}
        if account_id:
            params["account_id"] = account_id
        if since:
            params["since"] = since.strftime("%Y-%m-%dT%H:%M:%S.000Z")

        transactions = []
        url = "/aggregation/transactions"

        with httpx.Client(base_url=self.base_url, headers=headers, timeout=30) as client:
            while url and len(transactions) < limit:
                resp = client.get(url, params=params if url == "/aggregation/transactions" else None)
                resp.raise_for_status()
                data = resp.json()
                transactions.extend(data.get("resources", []))
                url = data.get("pagination", {}).get("next_uri")
                params = {}

        return transactions[:limit]

    def get_user_access_token(self, bridge_user_uuid: str) -> str:
        """Récupère l'access token d'un utilisateur Bridge via son UUID."""
        with self._client() as client:
            resp = client.get(f"/aggregation/users/{bridge_user_uuid}/access-token")
            resp.raise_for_status()
            return resp.json()["access_token"]

    def get_item_by_uuid(self, bridge_user_uuid: str, item_uuid: str) -> dict:
        """Récupère les détails d'un item Bridge (connexion bancaire)."""
        user_access_token = self.get_user_access_token(bridge_user_uuid)
        headers = {**self.headers, "Authorization": f"Bearer {user_access_token}"}
        with httpx.Client(base_url=self.base_url, headers=headers, timeout=30) as client:
            resp = client.get(f"/aggregation/items/{item_uuid}")
            resp.raise_for_status()
            return resp.json()

    def refresh_item(self, user_access_token: str, item_id: int) -> dict:
        """Force une mise à jour des données d'une connexion bancaire."""
        headers = {**self.headers, "Authorization": f"Bearer {user_access_token}"}
        with httpx.Client(base_url=self.base_url, headers=headers, timeout=60) as client:
            resp = client.post(f"/aggregation/items/{item_id}/refresh")
            resp.raise_for_status()
            return resp.json()


bridge_service = BridgeService()
