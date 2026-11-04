package com.example.demo.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.type.descriptor.jdbc.VarbinaryJdbcType;
import org.hibernate.annotations.ColumnTransformer;
import java.time.LocalDate;
import java.util.Base64;
import java.util.UUID;

@Entity
@Table(name = "residents")
public class ResidentUser {
    
    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "resident_id", unique = true)
    private String residentId;
    
    private String firstName;
    private String lastName;
    private String gender;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    private String email;
    
    private String mobileNumber;

    private String address;
    private String barangayIndigency;
    private String validId;
    private String status;
    private String account_status;
    
    @Column(name = "selfie", columnDefinition = "VARCHAR")
    private String selfie; 

    private String imageType; 
    
    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "pwd_image", columnDefinition = "VARCHAR")
    private String pwdImage; 

    @Column(name = "senior_image", columnDefinition = "VARCHAR")
    private String seniorImage; 

    @Column(name = "is_pwd")
    private Boolean isPwd;

    @Column(name = "is_senior")
    private Boolean isSenior;


    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getResidentId() { return residentId; }
    public void setResidentId(String residentId) { this.residentId = residentId; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getBarangayIndigency() { return barangayIndigency; }
    public void setBarangayIndigency(String barangayIndigency) { this.barangayIndigency = barangayIndigency; }

    public String getValidId() { return validId; }
    public void setValidId(String validId) { this.validId = validId; }

    public String getSelfie() { return selfie; }
    public void setSelfie(String selfie) { this.selfie = selfie; }

    public String getImageType() { return imageType; }
    public void setImageType(String imageType) { this.imageType = imageType; }

    public String getStatus() { return status; }
    public void setStatus(String Account_status) { this.status = Account_status; }
    
    public String getAccount_status() { return account_status; }
    public void setAccount_status(String account_status) { this.account_status = account_status; }
    
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getPwdImage() { return pwdImage; }
    public void setPwdImage(String pwdImage) { this.pwdImage = pwdImage; }

    public String getSeniorImage() { return seniorImage; }
    public void setSeniorImage(String seniorImage) { this.seniorImage = seniorImage; }

    public Boolean isPwd() { return isPwd; }
    public void setPwd(Boolean isPwd) { this.isPwd = isPwd; }

    public Boolean isSenior() { return isSenior; }
    public void setSenior(Boolean isSenior) { this.isSenior = isSenior; }
}