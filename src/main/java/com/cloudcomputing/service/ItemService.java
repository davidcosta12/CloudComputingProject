
package com.cloudcomputing.service;

import com.cloudcomputing.model.Item;
import com.cloudcomputing.repository.ItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ItemService {

    private final ItemRepository repo;

    public ItemService(ItemRepository repo) {
        this.repo = repo;
    }

    public List<Item> findAll() {
        return repo.findAll();
    }

    public Optional<Item> findById(Long id) {
        return repo.findById(id);
    }

    @Transactional
    public Item save(Item item) {

        item.setId(null);
        return repo.save(item);
    }

    @Transactional
    public Optional<Item> update(Long id, Item updated) {
        return repo.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setDescription(updated.getDescription());
            return repo.save(existing);
        });
    }

    @Transactional
    public boolean delete(Long id) {
        return repo.findById(id).map(i -> {
            repo.deleteById(id);
            return true;
        }).orElse(false);
    }
}