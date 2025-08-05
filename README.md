# 🚀 Investomania - Trading Game Platform

A modern, full-stack trading simulation game built with React, Node.js, and Supabase. Perfect for educational purposes and trading competitions.

## 🎯 Features

- **User Authentication**: Secure login system with pre-generated user credentials
- **Modern UI**: Beautiful glass morphism design with dark theme
- **Real-time Data**: Built with Supabase for real-time capabilities
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Trading Simulation**: Ready for stock trading game implementation

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **CSS3** - Custom styling with glass morphism effects
- **Supabase JS** - Real-time database and authentication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework (ready for API expansion)
- **Supabase** - Database and authentication service

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd investo-app
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd investo-frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../investo-backend
   npm install
   ```

4. **Environment Setup**
   
   Create `.env` file in `investo-frontend/`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start Development Servers**
   
   Frontend:
   ```bash
   cd investo-frontend
   npm run dev
   ```
   
   Backend:
   ```bash
   cd investo-backend
   npm start
   ```

## 🎮 Demo Credentials

The app comes with 300 pre-generated user accounts for testing:

- **Username Format**: YLES-001 to YLES-300
- **Example**: 
  - Username: `YLES-001`
  - Password: `Yagm0yHecHh0`

> See `investo-frontend/user-credentials.json` for all available accounts.

## 📁 Project Structure

```
investo-app/
├── investo-frontend/          # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Dashboard.jsx  # Main dashboard
│   │   │   └── Login.jsx      # Login form
│   │   ├── lib/
│   │   │   └── supabase.js    # Supabase configuration
│   │   ├── App.jsx           # Main app component
│   │   └── index.css         # Global styles
│   ├── user-credentials.json  # Demo user accounts
│   └── package.json
├── investo-backend/           # Node.js backend (expandable)
│   ├── server.js             # Express server setup
│   └── package.json
└── README.md
```

## 🎨 Design Features

- **Glass Morphism UI**: Modern translucent design elements
- **Dark Theme**: Professional dark color scheme
- **Gradient Accents**: Beautiful red-to-amber gradient branding
- **Responsive Layout**: Mobile-first design approach
- **Loading States**: Smooth loading animations

## 🔧 Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**
- `npm start` - Start Express server
- `npm run dev` - Start with nodemon (auto-reload)

### Code Style
- ES6+ JavaScript
- React functional components with hooks
- CSS custom properties for theming
- Mobile-first responsive design

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `dist` folder

### Backend (Heroku/Railway)
1. Push to your git repository
2. Connect to deployment platform
3. Set environment variables

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Supabase for the backend infrastructure
- Vite for the blazing fast build tool

---

**Built with ❤️ for trading education and competition platforms**
