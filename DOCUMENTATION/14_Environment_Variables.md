# Environment Variables - Complete Reference

## Backend Environment Variables

File: `backend/.env`

### Required Variables

#### Database Configuration
```env
DB_HOST=localhost
```
- **Description**: MySQL server hostname
- **Default**: `localhost`
- **Example**: `localhost`, `127.0.0.1`, `mysql.example.com`

```env
DB_PORT=3306
```
- **Description**: MySQL server port
- **Default**: `3306`
- **Example**: `3306`, `3307`

```env
DB_USER=root
```
- **Description**: MySQL username
- **Default**: `root`
- **Example**: `root`, `watertracker_user`

```env
DB_PASSWORD=your_mysql_password
```
- **Description**: MySQL password
- **Required**: Yes
- **Example**: `mypassword123`, `SecurePass!2024`

```env
DB_NAME=watertracker
```
- **Description**: Database name
- **Default**: `watertracker`
- **Example**: `watertracker`, `watertracker_prod`

#### Authentication
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```
- **Description**: Secret key for signing JWT tokens
- **Required**: Yes
- **Security**: Use a long, random string in production
- **Example**: `my-super-secret-key-12345`, `a1b2c3d4e5f6g7h8i9j0`

```env
JWT_EXPIRES_IN=7d
```
- **Description**: JWT token expiration time
- **Default**: `7d`
- **Format**: Number + unit (s, m, h, d)
- **Example**: `1h`, `24h`, `7d`, `30d`

#### Server Configuration
```env
PORT=8000
```
- **Description**: Backend server port
- **Default**: `5000`
- **Example**: `3000`, `5000`, `8000`, `8080`

```env
NODE_ENV=development
```
- **Description**: Environment mode
- **Options**: `development`, `production`
- **Default**: `development`

#### CORS Configuration
```env
CORS_ORIGIN=http://localhost:5173
```
- **Description**: Allowed frontend origin
- **Default**: `http://localhost:5173`
- **Production**: Set to your production domain
- **Example**: `https://watertracker.com`, `http://localhost:5173`

---

## Frontend Environment Variables

File: `frontend/.env`

### Required Variables

```env
VITE_API_URL=http://localhost:8000/api
```
- **Description**: Backend API base URL
- **Required**: Yes
- **Format**: Full URL with protocol
- **Example**: `http://localhost:8000/api`, `https://api.watertracker.com/api`

**Note**: Vite requires `VITE_` prefix for environment variables to be exposed to client code.

---

## Complete Example Files

### `backend/.env` (Complete)
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=trony1234
DB_NAME=watertracker

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Server
PORT=8000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

### `frontend/.env` (Complete)
```env
VITE_API_URL=http://localhost:8000/api
```

---

## Environment-Specific Configurations

### Development
```env
# Backend
NODE_ENV=development
PORT=8000
CORS_ORIGIN=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8000/api
```

### Production
```env
# Backend
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://watertracker.com
JWT_SECRET=<strong-random-secret>

# Frontend
VITE_API_URL=https://api.watertracker.com/api
```

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** (minimum 32 characters, random)
3. **Use different secrets** for development and production
4. **Restrict CORS** to specific domains in production
5. **Use environment variables** for all sensitive data
6. **Rotate secrets** periodically
7. **Use `.env.example`** files as templates

---

## Accessing Environment Variables

### Backend (Node.js)
```javascript
// Using dotenv
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT;
const dbPassword = process.env.DB_PASSWORD;
```

### Frontend (Vite)
```javascript
// Must have VITE_ prefix
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## Troubleshooting

### Variable Not Found
- Check file is named `.env` (not `.env.txt`)
- Check file is in correct directory
- Restart server after changing `.env`
- Check for typos in variable names

### Frontend Variable Not Working
- Must have `VITE_` prefix
- Restart dev server after changes
- Check `import.meta.env` syntax

### Database Connection Issues
- Verify MySQL is running
- Check credentials are correct
- Test connection with MySQL client
- Check firewall settings

---

## Creating .env Files

### Backend
```bash
cd backend
# Copy from example or create new
# Edit with your values
```

### Frontend
```bash
cd frontend
# Create .env file
echo "VITE_API_URL=http://localhost:8000/api" > .env
```

---

## Validation

The application will:
- Use defaults if variables are missing
- Log errors if required variables are missing
- Fail to start if database connection fails
- Show connection errors in console

---

## Notes

- `.env` files are in `.gitignore` (not committed)
- Create `.env.example` files as templates
- Document all required variables
- Use different values for dev/prod
- Keep secrets secure



