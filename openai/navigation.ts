export interface DashboardRoute {
  path: string;
  name: string;
  keywords: string[];
}

const routes: DashboardRoute[] = [
  {
    path: "/links",
    name: "Conexiones bancarias",
    keywords: ["links", "conexiones", "conexiones bancarias", "banking links", "vinculos"],
  },
  {
    path: "/payments",
    name: "Pagos",
    keywords: ["pagos", "payments", "payment intents", "intenciones de pago"],
  },
  {
    path: "/charges",
    name: "Cobros",
    keywords: ["cobros", "charges", "cargos"],
  },
  {
    path: "/subscriptions",
    name: "Suscripciones",
    keywords: ["suscripciones", "subscriptions", "debito directo", "débito directo", "recurring"],
  },
  {
    path: "/payouts",
    name: "Payouts",
    keywords: ["payouts", "dispersiones", "desembolsos"],
  },
  {
    path: "/transfers",
    name: "Transferencias",
    keywords: ["transferencias", "transfers", "envios", "envíos"],
  },
  {
    path: "/transfer-batches",
    name: "Lotes de transferencias",
    keywords: ["lotes", "batches", "transfer batches", "lotes de transferencias", "transferencias masivas"],
  },
  {
    path: "/account-numbers",
    name: "Números de cuenta",
    keywords: ["numeros de cuenta", "números de cuenta", "account numbers"],
  },
  {
    path: "/accounts",
    name: "Cuentas",
    keywords: ["cuentas", "accounts", "mis cuentas"],
  },
  {
    path: "/entities",
    name: "Entidades",
    keywords: ["entidades", "entities"],
  },
  {
    path: "/analytics",
    name: "Analíticas",
    keywords: ["analiticas", "analíticas", "analytics", "estadisticas", "estadísticas", "stats", "metricas", "métricas"],
  },
  {
    path: "/api-keys",
    name: "API Keys",
    keywords: ["api keys", "llaves", "keys", "claves", "api"],
  },
  {
    path: "/webhook-endpoints",
    name: "Webhooks",
    keywords: ["webhooks", "webhook", "endpoints", "webhook endpoints"],
  },
  {
    path: "/organization",
    name: "Configuración",
    keywords: ["configuracion", "configuración", "settings", "config", "organizacion", "organización", "organization", "ajustes", "preferencias"],
  },
];

export function resolveRoute(query: string): DashboardRoute | null {
  const normalized = query.toLowerCase().trim();

  for (const route of routes) {
    for (const keyword of route.keywords) {
      if (normalized === keyword || normalized === route.name.toLowerCase()) {
        return route;
      }
    }
  }

  for (const route of routes) {
    for (const keyword of route.keywords) {
      if (normalized.includes(keyword) || keyword.includes(normalized)) {
        return route;
      }
    }
    if (route.name.toLowerCase().includes(normalized) || normalized.includes(route.name.toLowerCase())) {
      return route;
    }
  }

  return null;
}

export function getAllRoutes(): { path: string; name: string }[] {
  return routes.map(({ path, name }) => ({ path, name }));
}
