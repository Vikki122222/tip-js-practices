// Общий HTTP-клиент: не знает маршрутов задач и не обращается к DOM.
export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl должен быть абсолютным HTTP(S)-адресом.");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch (cause) {
    throw new TypeError("baseUrl должен быть абсолютным HTTP(S)-адресом.", { cause });
  }
  if (!["http:", "https:"].includes(url.protocol)
      || url.href.includes("?") || url.href.includes("#")) {
    throw new TypeError("baseUrl должен использовать HTTP(S) и не содержать query или hash.");
  }
  return url.href.replace(/\/+$/, "");
}

function checkTimeout(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
    throw new TypeError("timeoutMs должен быть целым числом от 1 до 2147483647.");
  }
}

// Пропускаем только undefined, null и пустую строку; false и 0 сохраняются.
export function buildUrl(baseUrl, path, query = {}) {
  const base = normalizeBaseUrl(baseUrl);
  if (typeof path !== "string" || path.trim() === ""
      || /^[a-z][a-z0-9+.-]*:/i.test(path.trim()) || /[?#]/.test(path)) {
    throw new TypeError("path должен быть непустым относительным путём без query и hash.");
  }
  if (!isPlainObject(query)) throw new TypeError("query должен быть обычным объектом.");
  const relative = path.trim().replace(/^\/+|\/+$/g, "");
  if (!relative) throw new TypeError("path не должен быть пустым.");
  const url = new URL(base + "/" + relative);
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(name, String(value));
  }
  return url.href;
}

export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 2000,
} = {}) {
  const base = normalizeBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") throw new TypeError("fetchFn должен быть функцией.");
  checkTimeout(timeoutMs);

  async function requestJson(path, options = {}) {
    if (!isPlainObject(options)) throw new TypeError("Параметры запроса должны быть объектом.");
    const { query = {}, signal, timeoutMs: requestTimeout = timeoutMs } = options;
    checkTimeout(requestTimeout);
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("signal должен быть AbortSignal.");
    }
    const url = buildUrl(base, path, query);
    const deadline = AbortSignal.timeout(requestTimeout);
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;

    // Причина объединённого сигнала принадлежит первой сработавшей отмене.
    function transportError(cause) {
      if (requestSignal.aborted) {
        const timedOut = deadline.aborted && requestSignal.reason === deadline.reason;
        return new ApiError(
          timedOut ? "Превышено время ожидания ответа." : "Запрос отменён вызывающим кодом.",
          { kind: timedOut ? "timeout" : "aborted", url, cause },
        );
      }
      return new ApiError("Не удалось получить ответ от сервера.", {
        kind: "network", url, cause,
      });
    }

    if (requestSignal.aborted) throw transportError(requestSignal.reason);

    // Здесь обрабатывается только получение Response, а не весь конвейер.
    let response;
    try {
      response = await fetchFn(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: requestSignal,
      });
    } catch (cause) {
      throw transportError(cause);
    }
    if (!(response instanceof Response)) {
      throw new ApiError("fetchFn вернул значение вместо Response.", {
        kind: "invalid-response", url,
      });
    }
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.split(";", 1)[0].trim().toLowerCase() === "application/json";

    // Приоритет HTTP-статуса сохраняется даже при HTML или повреждённом теле ошибки.
    if (!response.ok) {
      let payload = null;
      let bodyError;
      if (isJson) {
        try {
          payload = await response.json();
        } catch (cause) {
          bodyError = cause;
        }
      }
      const error = isPlainObject(payload) && isPlainObject(payload.error)
        ? payload.error : null;
      throw new ApiError(
        typeof error?.message === "string" && error.message.trim()
          ? error.message : "HTTP " + response.status,
        {
          kind: "http",
          status: response.status,
          code: typeof error?.code === "string" ? error.code : null,
          details: error?.details ?? null,
          url,
          cause: bodyError,
        },
      );
    }
    if (response.status === 204) return null;
    if (!isJson) {
      throw new ApiError("Ожидался Content-Type application/json.", {
        kind: "invalid-response", url,
      });
    }
    try {
      return await response.json();
    } catch (cause) {
      // Тайм-аут или отмена могут произойти и во время чтения тела.
      if (requestSignal.aborted) throw transportError(cause);
      throw new ApiError("Ответ содержит некорректный JSON.", {
        kind: "invalid-response", url, cause,
      });
    }
  }

  return { requestJson };
}
