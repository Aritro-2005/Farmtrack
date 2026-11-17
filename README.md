<div align="center">

# 🌱 FarmTrack

### Bringing farmers and consumers closer with a more transparent food supply chain.

A blockchain-based farm-to-consumer platform with role-based web pages and Hyperledger Fabric chaincode for recording orders, payments, and shipments.

[Explore the project](https://github.com/Aritro-2005/Farmtrack) · [Report a bug](https://github.com/Aritro-2005/Farmtrack/issues)

![HTML](https://img.shields.io/badge/HTML- frontend?style=flat&logo=html5&logoColor=white&color=E34F26)
![CSS](https://img.shields.io/badge/CSS-styles?style=flat&logo=css3&logoColor=white&color=1572B6)
![JavaScript](https://img.shields.io/badge/JavaScript-interactions?style=flat&logo=javascript&logoColor=black&color=F7DF1E)
![Go](https://img.shields.io/badge/Go-chaincode%20%26%20integration?style=flat&logo=go&logoColor=white&color=00ADD8)
![PHP](https://img.shields.io/badge/PHP-web%20backend?style=flat&logo=php&logoColor=white&color=777BB4)

</div>

---

## 🌾 About

FarmTrack is a prototype for connecting farmers directly with consumers and improving visibility across agricultural transactions. Its frontend includes pages for farmers, consumers, distributors, and government users. The backend contains Hyperledger Fabric chaincode and Go scripts that connect application data with a Fabric network.

The project aims to support:

- **Direct connections** between farmers and consumers
- **On-chain records** for orders, payments, and shipment activity
- **Role-oriented experiences** for different supply-chain participants
- **A PHP and MySQL application layer** for account and application data

> FarmTrack is an evolving project. See the repository code for the functionality currently implemented; some ideas described in the interface may be prototypes or planned features.

## 🧭 How it fits together

```text
Farmers / Consumers / Other users
                 │
                 ▼
       Frontend (HTML, CSS, JS)
                 │
                 ▼
        PHP application + MySQL
                 │
                 ▼
       Go integration scripts
                 │
                 ▼
  Hyperledger Fabric chaincode/network
```

The chaincode currently includes contracts for **orders**, **payments**, and **shipments**. Go scripts provide database-to-ledger integration. The scripts in this repository reference a local Fabric test network and a MySQL database named `farmtrack`.

## 📁 Repository layout

```text
Farmtrack/
├── Backend/
│   ├── Chaincode/          # Fabric chaincode (Go)
│   └── Scripting Code/     # Go scripts for database/Fabric integration
└── Frontend/               # HTML, CSS, JavaScript, and PHP application files
```

## 🛠️ Technology

| Area | Technologies |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Web backend | PHP |
| Application database | MySQL |
| Blockchain | Hyperledger Fabric, Go chaincode |
| Integration | Go, Fabric Gateway, gRPC |

## 🚀 Getting started

### Requirements

- PHP with the `mysqli` extension
- MySQL
- Go and the dependencies used by the Fabric chaincode/integration scripts
- A configured and running Hyperledger Fabric network with a channel, peer identity, certificates, and deployed chaincode

### Run the web application locally

1. Clone the repository and enter the frontend directory:

   ```bash
   git clone https://github.com/Aritro-2005/Farmtrack.git
   cd Farmtrack/Frontend
   ```

2. Start PHP's local development server:

   ```bash
   php -S localhost:8000
   ```

3. Open [http://localhost:8000](http://localhost:8000) in your browser.

The PHP files expect a local MySQL database named `farmtrack`. Configure MySQL and create the tables required by the PHP pages before testing features that read or write database records. A database schema or migration file is not currently included in the repository.

### Fabric integration

The Go integration scripts are configured for a local Fabric test network (including `mychannel`, `Org1MSP`, and a peer at `localhost:7051`). They also contain machine-specific certificate/key paths and database connection settings. Before running them, set up the matching Fabric network and chaincode, configure the database, and update those paths/settings for your environment.

> **Security note:** Do not use the example local credentials or hard-coded certificate paths in a production deployment. Keep private keys and credentials out of source control, and use secure configuration appropriate to your environment.

## 🧑‍🌾 Typical user journey

1. A user opens the FarmTrack web interface and signs in through the relevant role.
2. A farmer and consumer can participate in the direct-order workflow.
3. Application records can be synchronized to the Fabric ledger by the backend integration scripts.
4. Order, payment, and shipment data can be represented by the corresponding chaincode contracts.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome. Please open an issue to discuss a substantial change, or submit a pull request with a clear description and testing notes.

## 📄 License

No license file is currently included. All rights are reserved unless the repository owner specifies otherwise. Please open an issue before reusing or distributing this project.

---

<div align="center">

**Built by Team AGRI_TECH_IT** · [GitHub repository](https://github.com/Aritro-2005/Farmtrack)

</div>
