import './loader.css';
export function Loader() {
  return <div className="spinner"></div>;
}

export const FullScreenLoader = () => (
  <div className="h-screen flex justify-center items-center">
    <Loader />
  </div>
);
