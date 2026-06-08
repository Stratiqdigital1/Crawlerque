const parseDomain = require('parse-domain');

function getBrandNameFromDomain(domain) {
  const parsed = parseDomain(domain);
  if (parsed) {
    return parsed.domain;  // Example: 'example.com' -> 'example'
  }
  return null;
}

module.exports = getBrandNameFromDomain;