# Security Policy

## Supported Versions

We are committed to maintaining security for the KCM (Kateri Camp Management) system. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| develop | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### For Critical Security Issues

1. **Do NOT open a public issue**
2. Email the maintainers privately at: [Add your security contact email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

### For General Security Questions

- Open a private security advisory through GitHub
- Use GitHub's security tab to report vulnerabilities privately

## Security Measures

This project implements several security measures:

- **Firebase Security Rules**: Comprehensive Firestore security rules for data access control
- **Authentication**: Firebase Authentication with role-based access control
- **CodeQL Analysis**: Automated code scanning for security vulnerabilities
- **Dependency Scanning**: Regular dependency updates and security monitoring
- **Environment Variables**: Secure handling of sensitive configuration
- **HTTPS Only**: All production traffic uses HTTPS
- **Regular Security Reviews**: Ongoing security assessments

## Compliance Considerations

This system handles sensitive data including:
- Medical information
- Payment data
- Personal information of minors

All development should follow:
- HIPAA compliance best practices for medical data
- PCI compliance for payment processing
- Privacy-by-design principles
- Data minimization practices

## Security Best Practices for Contributors

1. Never commit secrets or credentials to the repository
2. Use environment variables for all sensitive configuration
3. Follow the principle of least privilege for access controls
4. Test security rules thoroughly before deployment
5. Keep dependencies updated and monitor for vulnerabilities
6. Use strong authentication for all access

## Acknowledgments

We appreciate responsible disclosure of security vulnerabilities and will acknowledge contributors in our security advisories when appropriate.