import { useState } from 'react'
import { AuthForm } from '@/components/form/sign'

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")

  const handleSubmit = (data: Record<string, string>) => {
    if (mode === "signin") {
      // Handle sign in
      console.log("Sign in data:", data)
    } else {
      // Handle sign up
      console.log("Sign up data:", data)
    }
  }

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin")
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <AuthForm
        mode={mode}
        onToggleMode={toggleMode}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default AuthPage