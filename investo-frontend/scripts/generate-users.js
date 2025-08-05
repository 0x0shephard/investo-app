import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// You'll need to add your service role key to .env for this script
const supabaseUrl = 'https://pgccktmzcjiiahxsralq.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Add this to your .env

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

async function createPredefinedUsers(count = 50) {
  const users = []
  
  console.log(`Creating ${count} predefined users...`)
  
  for (let i = 1; i <= count; i++) {
    const username = `YLES-${String(i).padStart(3, '0')}`
    const password = generatePassword()
    const email = `${username.toLowerCase()}@investo.local`
    
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username,
          display_name: username
        }
      })

      if (authError) {
        console.error(`Error creating user ${username}:`, authError.message)
        continue
      }

      // The trigger 'on_auth_user_created' will now handle profile creation automatically.

      users.push({ username, password, email })
      console.log(`✓ Created user: ${username}`)
      
    } catch (error) {
      console.error(`Error creating ${username}:`, error.message)
    }
  }
  
  // Save credentials to file
  const credentialsData = {
    generatedAt: new Date().toISOString(),
    totalUsers: users.length,
    users: users
  }
  
  fs.writeFileSync('user-credentials.json', JSON.stringify(credentialsData, null, 2))
  console.log(`\nGenerated ${users.length} users. Credentials saved to user-credentials.json`)
  
  return users
}

// Example usage
if (process.argv[2] === 'run') {
  const count = parseInt(process.argv[3]) || 10
  createPredefinedUsers(count).then(() => {
    console.log('User generation complete!')
    process.exit(0)
  }).catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })
}
