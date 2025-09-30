# Contributing to AI Fitness Coach

Thank you for your interest in contributing to AI Fitness Coach! 🎯

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, browser)

### Suggesting Features

We welcome feature suggestions! Please open an issue with:
- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

#### Code Style

- Use ESLint for JavaScript/React code
- Follow existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic

#### Testing

- Test your changes locally before submitting
- Ensure the app runs without errors
- Test with real Strava data if possible

#### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove)
- Keep the first line under 50 characters
- Add details in the body if needed

Example:
```
Add weather integration for indoor/outdoor decisions

- Fetch weather data from OpenWeather API
- Display forecast in session recommendations
- Suggest indoor alternatives for bad weather
```

## Development Setup

1. Clone your fork
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your API keys
4. Start development server: `npm run dev`
5. Make your changes
6. Test thoroughly

## Areas for Contribution

### High Priority
- Multi-sport support (running, swimming)
- Weather integration
- Zwift workout export
- Mobile responsiveness improvements
- Unit tests

### Medium Priority
- Social features (share plans)
- Coach mode (manage multiple athletes)
- Advanced analytics
- Training plan templates
- Export/import functionality

### Low Priority
- Dark mode
- Internationalization
- Progressive Web App features
- Offline support

## Questions?

Feel free to open an issue for any questions about contributing!

Thank you for helping make AI Fitness Coach better! 🙏
