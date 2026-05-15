// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {
    address public owner;
    mapping(address => bool) public admins;

    enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
    enum CertStatus {
        ACTIVE,
        REVOKED
    }

    struct CertRequest {
        string id; // cuid from Prisma
        string userId;
        string domain;
        string csrPemHash; // Store hash to save gas
        RequestStatus status;
        uint256 createdAt;
    }

    struct Certificate {
        string id;
        string serialNumber;
        string certPemHash;
        string subjectDN;
        string issuerDN;
        uint256 notBefore;
        uint256 notAfter;
        CertStatus status;
    }

    struct RevocationRequest {
        string id;
        string certificateId;
        string userId;
        string reason;
        RequestStatus status;
        uint256 createdAt;
    }

    // Storage
    mapping(string => CertRequest) public requests;
    mapping(string => Certificate) public certificates;
    mapping(string => string) public serialToCertId; // serialNumber => id
    mapping(string => bool) public revokedCertificates; // serialNumber => isRevoked
    mapping(string => RevocationRequest) public revocationRequests;

    // Mappings to get data for user
    mapping(string => string[]) public userRequests; // userId => request ids
    mapping(string => string[]) public userCertificates; // userId => certificate ids
    mapping(string => string[]) public userRevocationRequests;

    // Events
    event RequestSubmitted(
        string indexed requestId,
        string indexed userId,
        string domain
    );
    event RequestStatusUpdated(string indexed requestId, RequestStatus status);
    event CertificateIssued(
        string indexed certId,
        string indexed serialNumber,
        string userId
    );
    event CertificateUpdated(string indexed certId, uint256 newNotBefore, uint256 newNotAfter);
    event CertificateRevoked(string indexed serialNumber, string reason);
    event RevocationRequestSubmitted(string indexed id, string indexed certificateId, string userId, string reason);
    event RevocationRequestStatusUpdated(string indexed id, RequestStatus status);

    modifier onlyAdmin() {
        require(msg.sender == owner || admins[msg.sender], "Not an admin");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }

    function addAdmin(address _admin) external onlyAdmin {
        admins[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyAdmin {
        require(_admin != owner, "Cannot remove owner");
        admins[_admin] = false;
    }

    // User or Relayer function
    function submitRequest(
        string memory _id,
        string memory _userId,
        string memory _domain,
        string memory _csrPemHash
    ) external {
        require(bytes(requests[_id].id).length == 0, "Request already exists");

        requests[_id] = CertRequest({
            id: _id,
            userId: _userId,
            domain: _domain,
            csrPemHash: _csrPemHash,
            status: RequestStatus.PENDING,
            createdAt: block.timestamp
        });

        userRequests[_userId].push(_id);
        emit RequestSubmitted(_id, _userId, _domain);
    }

    function updateRequestStatus(
        string memory _id,
        RequestStatus _status
    ) external onlyAdmin {
        require(bytes(requests[_id].id).length != 0, "Request not found");
        requests[_id].status = _status;
        emit RequestStatusUpdated(_id, _status);
    }

    function submitRevocationRequest(
        string memory _id,
        string memory _certificateId,
        string memory _userId,
        string memory _reason
    ) external {
        require(bytes(revocationRequests[_id].id).length == 0, "Request already exists");
        
        revocationRequests[_id] = RevocationRequest({
            id: _id,
            certificateId: _certificateId,
            userId: _userId,
            reason: _reason,
            status: RequestStatus.PENDING,
            createdAt: block.timestamp
        });

        userRevocationRequests[_userId].push(_id);
        emit RevocationRequestSubmitted(_id, _certificateId, _userId, _reason);
    }

    function updateRevocationRequestStatus(
        string memory _id,
        RequestStatus _status
    ) external onlyAdmin {
        require(bytes(revocationRequests[_id].id).length != 0, "Request not found");
        revocationRequests[_id].status = _status;
        emit RevocationRequestStatusUpdated(_id, _status);
    }


    function issueCertificate(
        string memory _id,
        string memory _serialNumber,
        string memory _userId,
        string memory _certPemHash,
        string memory _subjectDN,
        string memory _issuerDN,
        uint256 _notBefore,
        uint256 _notAfter
    ) external onlyAdmin {
        require(
            bytes(certificates[_id].id).length == 0,
            "Certificate already exists"
        );

        certificates[_id] = Certificate({
            id: _id,
            serialNumber: _serialNumber,
            certPemHash: _certPemHash,
            subjectDN: _subjectDN,
            issuerDN: _issuerDN,
            notBefore: _notBefore,
            notAfter: _notAfter,
            status: CertStatus.ACTIVE
        });

        serialToCertId[_serialNumber] = _id;
        userCertificates[_userId].push(_id);
        emit CertificateIssued(_id, _serialNumber, _userId);
    }

    function updateCertificate(
        string memory _id,
        string memory _certPemHash,
        uint256 _notBefore,
        uint256 _notAfter
    ) external onlyAdmin {
        require(
            bytes(certificates[_id].id).length != 0,
            "Certificate does not exist"
        );

        certificates[_id].certPemHash = _certPemHash;
        certificates[_id].notBefore = _notBefore;
        certificates[_id].notAfter = _notAfter;

        emit CertificateUpdated(_id, _notBefore, _notAfter);
    }

    function revokeCertificate(
        string memory _serialNumber,
        string memory _reason
    ) external onlyAdmin {
        require(!revokedCertificates[_serialNumber], "Already revoked");
        revokedCertificates[_serialNumber] = true;

        string memory certId = serialToCertId[_serialNumber];
        if (bytes(certId).length != 0) {
            certificates[certId].status = CertStatus.REVOKED;
        }

        emit CertificateRevoked(_serialNumber, _reason);
    }

    function isRevoked(
        string memory _serialNumber
    ) external view returns (bool) {
        return revokedCertificates[_serialNumber];
    }

    function getUserRequests(
        string memory _userId
    ) external view returns (string[] memory) {
        return userRequests[_userId];
    }

    function getUserCertificates(
        string memory _userId
    ) external view returns (string[] memory) {
        return userCertificates[_userId];
    }

    function getUserRevocationRequests(
        string memory _userId
    ) external view returns (string[] memory) {
        return userRevocationRequests[_userId];
    }
}
