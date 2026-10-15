// backend/utils/pagination.js — small helpers shared by the admin list routes (orders, subscribers, products)

// Escapes user input before it goes into a RegExp (stops regex injection and "$" / "." breaking the query)
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MAX_PAGE = 100000; // a silly ?page= can't ask Mongo to skip billions of rows

/**
 * Reads ?page= and ?limit= from a query. Bad or missing values fall back to page 1 and the default limit;
 * the limit can never go above maxLimit. Returns { page, limit, skip }.
 */
function parsePaging(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.min(MAX_PAGE, Math.max(1, parseInt(query.page, 10) || 1));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** The numbers every paginated response carries: { total, page, pages, limit } (pages is at least 1). */
const pageInfo = (total, { page, limit }) => ({ total, page, pages: Math.max(1, Math.ceil(total / limit)), limit });

/** ?search= as clean text: "" unless it is a string, trimmed and capped (repeated ?search=a&search=b is ignored). */
const searchTerm = (value, max = 100) => (typeof value === "string" ? value.trim().slice(0, max) : "");

module.exports = { escapeRegex, parsePaging, pageInfo, searchTerm };
