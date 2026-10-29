package com.fizzdrop.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AuthResponse {
    private String token;

    @JsonProperty("user_id")
    private Long userId;

    private String email;

    @JsonProperty("role_id")
    private Long roleId;

    @JsonProperty("role_name")
    private String roleName;

    private String role;

    @JsonProperty("branch_id")
    private Long branchId;

    public AuthResponse() {}

    public AuthResponse(String token, Long userId, String email, Long roleId, String roleName, Long branchId) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.roleId = roleId;
        this.roleName = roleName;
        this.role = roleName;
        this.branchId = branchId;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { 
        this.roleName = roleName;
        this.role = roleName;
    }

    public String getRole() { return role != null ? role : roleName; }
    public void setRole(String role) { 
        this.role = role;
        if (this.roleName == null) this.roleName = role;
    }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
