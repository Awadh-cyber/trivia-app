import { convertApiQuestions } from '../src/api/convertQuestions';
import { decodeHtmlEntities } from '../src/utils/decodeHtmlEntities';
import { shuffle } from '../src/utils/shuffle';

describe('decodeHtmlEntities', () => {
  it('decodes the codes Open Trivia Database uses', () => {
    expect(decodeHtmlEntities('What&#039;s this?')).toBe("What's this?");
    expect(decodeHtmlEntities('&quot;Veni, vidi, vici&quot;')).toBe('"Veni, vidi, vici"');
    expect(decodeHtmlEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(decodeHtmlEntities('3 &lt; 5 &gt; 2')).toBe('3 < 5 > 2');
    expect(decodeHtmlEntities('Pok&eacute;mon')).toBe('Pokémon');
    expect(decodeHtmlEntities('M&uuml;ller, Espa&ntilde;a, &Ouml;sterreich')).toBe('Müller, España, Österreich');
    expect(decodeHtmlEntities('&ldquo;Hi&rdquo; &ndash; it&rsquo;s 90&deg;&hellip;')).toBe('“Hi” – it’s 90°…');
    expect(decodeHtmlEntities('&#x27;hex&#X27;')).toBe("'hex'");
    expect(decodeHtmlEntities('&pi; &amp;&amp; &Omega;')).toBe('π && Ω');
  });

  it('decodes in one pass and leaves unknown codes alone', () => {
    expect(decodeHtmlEntities('&amp;quot;')).toBe('&quot;');
    expect(decodeHtmlEntities('&notacode; & plain')).toBe('&notacode; & plain');
    expect(decodeHtmlEntities('&#0; &#99999999;')).toBe('&#0; &#99999999;');
    expect(decodeHtmlEntities('no codes here')).toBe('no codes here');
  });
});

describe('shuffle', () => {
  it('keeps every item exactly once and does not change the original', () => {
    const original = [1, 2, 3, 4];
    for (let run = 0; run < 50; run++) {
      const result = shuffle(original);
      expect([...result].sort()).toEqual([1, 2, 3, 4]);
    }
    expect(original).toEqual([1, 2, 3, 4]);
  });

  it('can produce different orders', () => {
    const orders = new Set(Array.from({ length: 200 }, () => shuffle(['A', 'B', 'C', 'D']).join('')));
    expect(orders.size).toBeGreaterThan(10);
  });
});

describe('convertApiQuestions', () => {
  const raw = {
    type: 'multiple',
    difficulty: 'easy',
    category: 'General Knowledge',
    question: 'Which of these is a &quot;fruit&quot;?',
    correct_answer: 'Apple',
    incorrect_answers: ['Carrot', 'Potato', 'Onion'],
  };

  it('keeps the correct answer matched for every possible shuffle', () => {
    for (let run = 0; run < 200; run++) {
      const [q] = convertApiQuestions([raw]);
      expect(q.choices[q.correctIndex]).toBe('Apple');
      expect([...q.choices].sort()).toEqual(['Apple', 'Carrot', 'Onion', 'Potato']);
    }
  });

  it('puts the correct answer in different positions', () => {
    const positions = new Set(Array.from({ length: 200 }, () => convertApiQuestions([raw])[0].correctIndex));
    expect(positions.size).toBe(4);
  });

  it('decodes the question and answers', () => {
    const [q] = convertApiQuestions([
      { ...raw, correct_answer: 'Tom &amp; Jerry', incorrect_answers: ['Rock &#039;n&#039; Roll', 'A', 'B'] },
    ]);
    expect(q.question).toBe('Which of these is a "fruit"?');
    expect(q.choices).toContain('Tom & Jerry');
    expect(q.choices).toContain("Rock 'n' Roll");
    expect(q.choices[q.correctIndex]).toBe('Tom & Jerry');
  });

  it('gives questions unique ids', () => {
    const qs = convertApiQuestions([raw, { ...raw, question: 'Other?' }]);
    expect(qs[0].id).not.toBe(qs[1].id);
  });

  it('rejects questions that are not four-choice', () => {
    expect(() => convertApiQuestions([{ ...raw, type: 'boolean' }])).toThrow();
    expect(() => convertApiQuestions([{ ...raw, incorrect_answers: ['x', 'y'] }])).toThrow();
    expect(() => convertApiQuestions([{ ...raw, correct_answer: 42 }])).toThrow();
    expect(() => convertApiQuestions([null])).toThrow();
  });
});
