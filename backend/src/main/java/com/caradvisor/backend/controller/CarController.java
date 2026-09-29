package com.caradvisor.backend.controller;

import com.caradvisor.backend.model.Car;
import com.caradvisor.backend.repository.CarRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cars")
public class CarController {

    private final CarRepository carRepository;

    public CarController(CarRepository carRepository) {
        this.carRepository = carRepository;
    }

    @GetMapping
    public List<Car> getAllCars() {
        return carRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Car> createCar(@Valid @RequestBody Car car) {
        Car savedCar = carRepository.save(car);
        return new ResponseEntity<>(savedCar, HttpStatus.CREATED);
    }
}