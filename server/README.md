# BhashaGPT Pro Server

A comprehensive Node.js Express server for BhashaGPT Pro - AI-powered language learning platform.

## 🚀 Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Rate Limiting**: Redis-based rate limiting for free vs paid users
- **AI Integration**: OpenAI GPT-4 chat completions and Whisper speech-to-text
- **Translation**: Google Translate API integration with caching
- **Payments**: Stripe subscription management
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for sessions and API response caching
- **Security**: Comprehensive security headers and input validation
- **Monitoring**: Structured logging and health checks

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT + bcrypt
- **External APIs**: OpenAI, Google Translate, Stripe
- **Logging**: Winston with daily rotation
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier

## 📦 Installation

1. **Clone and navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure the following:

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_TRANSLATE_API_KEY`: Google Translate API key
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `COOKIE_SECRET`: Secret for cookie signing

### Optional Variables
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production/test)
- `LOG_LEVEL`: Logging level (error/warn/info/debug)

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

### Chat Endpoints
- `POST /chat/completions` - Create chat completion
- `GET /chat/sessions` - Get user chat sessions
- `POST /chat/sessions` - Create new chat session

### Voice Endpoints
- `POST /voice/transcribe` - Transcribe audio to text
- `POST /voice/synthesize` - Text to speech synthesis

### Translation Endpoints
- `POST /translate` - Translate text
- `POST /translate/batch` - Batch translate multiple texts

### User Endpoints
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `DELETE /users/account` - Delete user account

### Subscription Endpoints
- `GET /subscriptions` - Get user subscription
- `POST /subscriptions` - Create subscription
- `PUT /subscriptions` - Update subscription
- `DELETE /subscriptions` - Cancel subscription

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Docker Deployment

1. **Build Docker image**:
   ```bash
   docker build -t bhashagpt-pro-server .
   ```

2. **Run container**:
   ```bash
   docker run -p 5000:5000 --env-file .env bhashagpt-pro-server
   ```

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

## 📊 Monitoring

### Health Checks
- Basic: `GET /health`
- Detailed: `GET /health/detailed`

### Logging
- Application logs: `./logs/application-YYYY-MM-DD.log`
- Error logs: `./logs/error-YYYY-MM-DD.log`
- Request logs: `./logs/requests-YYYY-MM-DD.log`

### Metrics
- Response times
- Error rates
- Database connection status
- Redis connection status
- External API status

## 🔒 Security

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Comprehensive request validation
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configurable cross-origin resource sharing
- **Password Hashing**: bcrypt with configurable rounds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

Built with ❤️ by the BhashaGPT Team