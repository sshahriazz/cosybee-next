/**
 * Renders a JSON-LD <script> tag for structured data. Server component —
 * the object is serialized at render time and never ships as client JS.
 *
 * Usage: <JsonLd data={articleSchema(article, path)} />
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
