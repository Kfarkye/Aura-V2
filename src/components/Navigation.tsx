import { Link } from 'react-router-dom';

export function Navigation({ user, loadingAuth, onSignIn, onSignOut }: any) {
  return (
    <nav className="p-4 flex justify-between items-center bg-neutral-900 border-b border-white/[0.04]">
        <Link to="/" className="text-xl font-bold text-white">Aura</Link>
        {user ? (
            <button onClick={onSignOut} className="text-neutral-400 hover:text-white">Sign Out</button>
        ) : (
            <button onClick={onSignIn} className="text-neutral-400 hover:text-white">Sign In</button>
        )}
    </nav>
  );
}
