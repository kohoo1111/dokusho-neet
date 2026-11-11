export default function Loading() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-[1600px] px-4 py-14 md:px-10">
      <div className="skeleton h-3 w-28 rounded-full" />
      <div className="skeleton mt-6 h-12 max-w-md rounded-xl" />
      <div className="mt-12 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 md:gap-5 xl:grid-cols-8">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[2/3] rounded-md" />
            <div className="skeleton mt-3 h-3 rounded" />
            <div className="skeleton mt-2 h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
