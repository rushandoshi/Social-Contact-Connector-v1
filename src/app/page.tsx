import Link from "next/link";
import { Users, Shield, UserCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-6">
          <Users className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Nexus Contacts
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          A social address book where your contact information is only visible
          to verified friends. Connect, share, stay private.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 mb-10 text-left">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <Shield className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              Privacy First
            </h3>
            <p className="text-sm text-gray-500">
              Control who sees your email, phone, and address with per-field
              privacy toggles.
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <UserCheck className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              Mutual Consent
            </h3>
            <p className="text-sm text-gray-500">
              Both parties must accept a connection before any private info is
              shared.
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <Users className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              Your Network
            </h3>
            <p className="text-sm text-gray-500">
              See your friends&apos; latest contact info in one clean dashboard.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
