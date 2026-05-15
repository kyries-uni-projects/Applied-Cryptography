// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CertificateRegistry.sol";

contract CertificateRegistryTest is Test {
    CertificateRegistry public registry;

    address owner = address(1);
    address admin1 = address(2);
    address user1 = address(3);
    address user2 = address(4);

    function setUp() public {
        vm.prank(owner);
        registry = new CertificateRegistry();
    }

    // =====================================
    // Admin Management Tests
    // =====================================

    function test_InitialState() public {
        assertEq(registry.owner(), owner);
        assertTrue(registry.admins(owner));
    }

    function test_AddAdmin() public {
        vm.prank(owner);
        registry.addAdmin(admin1);
        assertTrue(registry.admins(admin1));
    }

    function test_AddAdmin_RevertIfNotAdmin() public {
        vm.expectRevert("Not an admin");
        vm.prank(user1);
        registry.addAdmin(admin1);
    }

    function test_RemoveAdmin() public {
        vm.startPrank(owner);
        registry.addAdmin(admin1);
        registry.removeAdmin(admin1);
        assertFalse(registry.admins(admin1));
        vm.stopPrank();
    }

    function test_RemoveAdmin_RevertIfOwner() public {
        vm.expectRevert("Cannot remove owner");
        vm.prank(owner);
        registry.removeAdmin(owner);
    }

    function test_AddAdmin_AsNonOwnerAdmin() public {
        vm.prank(owner);
        registry.addAdmin(admin1);

        vm.prank(admin1);
        registry.addAdmin(user2);
        assertTrue(registry.admins(user2));
    }

    // =====================================
    // Certificate Request Tests
    // =====================================

    function test_SubmitRequest() public {
        vm.prank(user1);
        registry.submitRequest("req1", "user1", "example.com", "hash1");

        (
            string memory id,
            string memory userId,
            string memory domain,
            string memory csrPemHash,
            CertificateRegistry.RequestStatus status,
            uint256 createdAt
        ) = registry.requests("req1");

        assertEq(id, "req1");
        assertEq(userId, "user1");
        assertEq(domain, "example.com");
        assertEq(csrPemHash, "hash1");
        assertEq(uint(status), uint(CertificateRegistry.RequestStatus.PENDING));
        assertGt(createdAt, 0);

        string[] memory userReqs = registry.getUserRequests("user1");
        assertEq(userReqs.length, 1);
        assertEq(userReqs[0], "req1");
    }

    function test_SubmitRequest_RevertIfAlreadyExists() public {
        vm.startPrank(user1);
        registry.submitRequest("req1", "user1", "example.com", "hash1");
        vm.expectRevert("Request already exists");
        registry.submitRequest("req1", "user1", "example.com", "hash1");
        vm.stopPrank();
    }

    function test_UpdateRequestStatus() public {
        vm.prank(user1);
        registry.submitRequest("req1", "user1", "example.com", "hash1");

        vm.prank(owner);
        registry.updateRequestStatus(
            "req1",
            CertificateRegistry.RequestStatus.APPROVED
        );

        (, , , , CertificateRegistry.RequestStatus status, ) = registry
            .requests("req1");
        assertEq(
            uint(status),
            uint(CertificateRegistry.RequestStatus.APPROVED)
        );
    }

    function test_UpdateRequestStatus_RevertIfNotAdmin() public {
        vm.prank(user1);
        registry.submitRequest("req1", "user1", "example.com", "hash1");

        vm.expectRevert("Not an admin");
        vm.prank(user1);
        registry.updateRequestStatus(
            "req1",
            CertificateRegistry.RequestStatus.APPROVED
        );
    }

    function test_UpdateRequestStatus_RevertIfNotFound() public {
        vm.expectRevert("Request not found");
        vm.prank(owner);
        registry.updateRequestStatus(
            "req1",
            CertificateRegistry.RequestStatus.APPROVED
        );
    }

    // =====================================
    // Certificate Tests
    // =====================================

    function test_IssueCertificate() public {
        vm.prank(owner);
        registry.issueCertificate(
            "cert1",
            "sn1",
            "user1",
            "certHash1",
            "CN=example.com",
            "CN=CA",
            1000,
            2000
        );

        (
            string memory id,
            string memory sn,
            string memory hash,
            string memory sub,
            string memory iss,
            uint256 nb,
            uint256 na,
            CertificateRegistry.CertStatus status
        ) = registry.certificates("cert1");

        assertEq(id, "cert1");
        assertEq(sn, "sn1");
        assertEq(hash, "certHash1");
        assertEq(sub, "CN=example.com");
        assertEq(iss, "CN=CA");
        assertEq(nb, 1000);
        assertEq(na, 2000);
        assertEq(uint(status), uint(CertificateRegistry.CertStatus.ACTIVE));

        string[] memory userCerts = registry.getUserCertificates("user1");
        assertEq(userCerts.length, 1);
        assertEq(userCerts[0], "cert1");
    }

    function test_IssueCertificate_RevertIfAlreadyExists() public {
        vm.startPrank(owner);
        registry.issueCertificate(
            "cert1",
            "sn1",
            "user1",
            "certHash1",
            "CN=example.com",
            "CN=CA",
            1000,
            2000
        );
        vm.expectRevert("Certificate already exists");
        registry.issueCertificate(
            "cert1",
            "sn2",
            "user2",
            "certHash2",
            "CN=test.com",
            "CN=CA",
            1000,
            2000
        );
        vm.stopPrank();
    }

    function test_UpdateCertificate() public {
        vm.startPrank(owner);
        registry.issueCertificate(
            "cert1",
            "sn1",
            "user1",
            "certHash1",
            "CN=example.com",
            "CN=CA",
            1000,
            2000
        );
        registry.updateCertificate("cert1", "newHash", 2000, 3000);
        vm.stopPrank();

        (, , string memory hash, , , uint256 nb, uint256 na, ) = registry
            .certificates("cert1");
        assertEq(hash, "newHash");
        assertEq(nb, 2000);
        assertEq(na, 3000);
    }

    function test_UpdateCertificate_RevertIfDoesNotExist() public {
        vm.expectRevert("Certificate does not exist");
        vm.prank(owner);
        registry.updateCertificate("cert1", "newHash", 2000, 3000);
    }

    // =====================================
    // Revocation Tests
    // =====================================

    function test_RevokeCertificate() public {
        vm.startPrank(owner);
        registry.issueCertificate(
            "cert1",
            "sn1",
            "user1",
            "certHash1",
            "CN=example.com",
            "CN=CA",
            1000,
            2000
        );
        registry.revokeCertificate("sn1", "Key Compromise");
        vm.stopPrank();

        assertTrue(registry.revokedCertificates("sn1"));
        assertTrue(registry.isRevoked("sn1"));
    }

    function test_RevokeCertificate_RevertIfAlreadyRevoked() public {
        vm.startPrank(owner);
        registry.issueCertificate(
            "cert1",
            "sn1",
            "user1",
            "certHash1",
            "CN=example.com",
            "CN=CA",
            1000,
            2000
        );
        registry.revokeCertificate("sn1", "Key Compromise");
        vm.expectRevert("Already revoked");
        registry.revokeCertificate("sn1", "Superseded");
        vm.stopPrank();
    }

    // =====================================
    // Revocation Request Tests
    // =====================================

    function test_SubmitRevocationRequest() public {
        vm.prank(user1);
        registry.submitRevocationRequest(
            "revReq1",
            "cert1",
            "user1",
            "Key lost"
        );

        (
            string memory id,
            string memory certId,
            string memory userId,
            string memory reason,
            CertificateRegistry.RequestStatus status,
            uint256 createdAt
        ) = registry.revocationRequests("revReq1");

        assertEq(id, "revReq1");
        assertEq(certId, "cert1");
        assertEq(userId, "user1");
        assertEq(reason, "Key lost");
        assertEq(uint(status), uint(CertificateRegistry.RequestStatus.PENDING));
        assertGt(createdAt, 0);

        string[] memory userRevReqs = registry.getUserRevocationRequests(
            "user1"
        );
        assertEq(userRevReqs.length, 1);
        assertEq(userRevReqs[0], "revReq1");
    }

    function test_SubmitRevocationRequest_RevertIfAlreadyExists() public {
        vm.startPrank(user1);
        registry.submitRevocationRequest(
            "revReq1",
            "cert1",
            "user1",
            "Key lost"
        );
        vm.expectRevert("Request already exists");
        registry.submitRevocationRequest(
            "revReq1",
            "cert1",
            "user1",
            "Key lost"
        );
        vm.stopPrank();
    }

    function test_UpdateRevocationRequestStatus() public {
        vm.prank(user1);
        registry.submitRevocationRequest(
            "revReq1",
            "cert1",
            "user1",
            "Key lost"
        );

        vm.prank(owner);
        registry.updateRevocationRequestStatus(
            "revReq1",
            CertificateRegistry.RequestStatus.APPROVED
        );

        (, , , , CertificateRegistry.RequestStatus status, ) = registry
            .revocationRequests("revReq1");
        assertEq(
            uint(status),
            uint(CertificateRegistry.RequestStatus.APPROVED)
        );
    }

    function test_UpdateRevocationRequestStatus_RevertIfNotFound() public {
        vm.expectRevert("Request not found");
        vm.prank(owner);
        registry.updateRevocationRequestStatus(
            "revReq1",
            CertificateRegistry.RequestStatus.APPROVED
        );
    }
}
