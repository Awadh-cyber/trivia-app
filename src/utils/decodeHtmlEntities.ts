// Latin-1 entity names for character codes 160 to 255, in order.
const LATIN1_NAMES = (
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr ' +
  'deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest ' +
  'Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ' +
  'ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig ' +
  'agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml ' +
  'eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'
).split(' ');

const NAMED_ENTITIES: Record<string, number> = {
  quot: 34, amp: 38, apos: 39, lt: 60, gt: 62,
  OElig: 338, oelig: 339, Scaron: 352, scaron: 353, Yuml: 376, fnof: 402, circ: 710, tilde: 732,
  ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222,
  dagger: 8224, Dagger: 8225, bull: 8226, hellip: 8230, permil: 8240, prime: 8242, Prime: 8243,
  lsaquo: 8249, rsaquo: 8250, euro: 8364, trade: 8482, larr: 8592, rarr: 8594,
  minus: 8722, infin: 8734, ne: 8800, le: 8804, ge: 8805,
  Alpha: 913, Beta: 914, Gamma: 915, Delta: 916, Theta: 920, Lambda: 923, Pi: 928, Sigma: 931, Phi: 934, Omega: 937,
  alpha: 945, beta: 946, gamma: 947, delta: 948, theta: 952, lambda: 955, mu: 956, pi: 960, sigma: 963, phi: 966, omega: 969,
};
LATIN1_NAMES.forEach((name, i) => {
  NAMED_ENTITIES[name] = 160 + i;
});

function fromCodePoint(code: number): string | null {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return null;
  return String.fromCodePoint(code);
}

/**
 * Turns HTML codes into real characters, e.g. `&quot;` → `"`, `&#039;` → `'`, `&eacute;` → `é`.
 * Works in a single pass, so `&amp;quot;` correctly becomes the text `&quot;`.
 * Unknown codes are left as they are.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    let decoded: string | null = null;
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      decoded = fromCodePoint(parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10));
    } else if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)) {
      decoded = fromCodePoint(NAMED_ENTITIES[body]);
    }
    return decoded ?? match;
  });
}
