const points = [
  { title: 'Free, with no account', text: 'Open a tool and use it. There is no sign-up and no charge.' },
  { title: 'Nothing saved on our servers', text: 'Documents are read in your browser. Only what a tool needs for item extraction is sent on for processing, and none of it is stored here.' },
  { title: 'Runs in the browser', text: 'There is nothing to install.' },
  { title: 'Minutes instead of retyping', text: 'Item names, quantities, prices and H.S. codes come out in a fixed format you can paste straight into your system.' },
];

export default function FeaturesSection() {
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:py-20">
        <h2 className="display text-4xl text-ink sm:text-5xl">Made for people who handle trade documents every day</h2>
        <dl>
          {points.map((p) => (
            <div key={p.title} className="border-t border-line py-5 first:border-t-0 first:pt-0">
              <dt className="text-lg font-semibold text-ink">{p.title}</dt>
              <dd className="mt-1 max-w-xl text-mute">{p.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
